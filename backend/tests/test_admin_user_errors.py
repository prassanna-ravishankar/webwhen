"""Regression tests for safe admin user-management error responses."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, call, create_autospec, patch
from uuid import uuid4

import pytest
from clerk_backend_api.users import Users

from webwhen.api.routers.admin_routes import users
from webwhen.api.routers.admin_routes.users import BulkUpdateUserRolesRequest
from webwhen.tasks.service import TaskService


@pytest.fixture
def mock_admin():
    admin = MagicMock()
    admin.clerk_user_id = "clerk_admin_123"
    return admin


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def mock_clerk():
    """Clerk client whose `users` methods enforce the real SDK signatures."""
    clerk = MagicMock()
    clerk.users = create_autospec(Users, instance=True)
    return clerk


@pytest.mark.asyncio
async def test_list_users_does_not_expose_clerk_exception(mock_admin, mock_db, mock_clerk):
    secret = "private Clerk failure details"
    mock_db.fetch_all.return_value = []
    mock_clerk.users.list_async.side_effect = RuntimeError(secret)

    with patch.object(users, "clerk_client", mock_clerk):
        result = await users.list_users(admin=mock_admin, db=mock_db)

    assert secret not in repr(result)
    assert result["warnings"] == ["Clerk role fetch failed. Roles may be incomplete."]


@pytest.mark.asyncio
async def test_list_users_pages_clerk_roles(mock_admin, mock_db, mock_clerk):
    def clerk_user(clerk_id, role=None):
        return SimpleNamespace(id=clerk_id, public_metadata={"role": role} if role else {})

    first_page = [clerk_user("clerk_admin", "admin")] + [
        clerk_user(f"clerk_{i}") for i in range(499)
    ]
    mock_clerk.users.list_async.side_effect = [first_page, [clerk_user("clerk_dev", "developer")]]
    mock_db.fetch_all.return_value = [
        {
            "id": uuid4(),
            "email": f"{clerk_id}@example.com",
            "clerk_user_id": clerk_id,
            "is_active": True,
            "created_at": None,
            "task_count": 0,
            "total_executions": 0,
            "notifications_count": 0,
        }
        for clerk_id in ("clerk_admin", "clerk_dev")
    ]

    with patch.object(users, "clerk_client", mock_clerk):
        result = await users.list_users(admin=mock_admin, db=mock_db)

    assert mock_clerk.users.list_async.await_args_list == [
        call(request={"limit": 500, "offset": 0}),
        call(request={"limit": 500, "offset": 500}),
    ]
    assert "warnings" not in result
    assert [u["role"] for u in result["users"]] == ["admin", "developer"]


@pytest.mark.asyncio
async def test_bulk_role_update_fetches_clerk_users_by_id(mock_admin, mock_db, mock_clerk):
    user_id = uuid4()
    clerk_user_id = "clerk_target_123"
    mock_db.fetch_all.return_value = [{"id": user_id, "clerk_user_id": clerk_user_id}]
    mock_clerk.users.list_async.return_value = [SimpleNamespace(id=clerk_user_id)]
    request = BulkUpdateUserRolesRequest(user_ids=[str(user_id)], role="developer")

    with (
        patch.object(users, "clerk_client", mock_clerk),
        patch.object(users.settings, "webwhen_noauth", False),
    ):
        result = await users.bulk_update_user_roles(request=request, admin=mock_admin, db=mock_db)

    mock_clerk.users.list_async.assert_awaited_once_with(
        request={"user_id": [clerk_user_id], "limit": 100}
    )
    mock_clerk.users.update_metadata_async.assert_awaited_once_with(
        user_id=clerk_user_id, public_metadata={"role": "developer"}
    )
    assert result == {"updated": 1, "failed": 0, "errors": []}


@pytest.mark.asyncio
async def test_deactivate_user_does_not_expose_task_exception(mock_admin, mock_db):
    secret = "private scheduler failure details"
    user_id = uuid4()
    task_id = uuid4()
    mock_db.fetch_one.return_value = {"id": user_id}
    mock_db.fetch_all.return_value = [{"id": task_id, "state": "active"}]

    with patch.object(TaskService, "pause", AsyncMock(side_effect=RuntimeError(secret))):
        result = await users.deactivate_user(user_id=user_id, admin=mock_admin, db=mock_db)

    assert secret not in repr(result)
    assert result["tasks_failed"] == [{"task_id": str(task_id), "error": "Failed to pause task"}]


@pytest.mark.asyncio
async def test_bulk_role_update_does_not_expose_clerk_exception(mock_admin, mock_db, mock_clerk):
    secret = "private Clerk update failure details"
    user_id = uuid4()
    clerk_user_id = "clerk_target_123"
    mock_db.fetch_all.return_value = [{"id": user_id, "clerk_user_id": clerk_user_id}]

    mock_clerk.users.list_async.return_value = [SimpleNamespace(id=clerk_user_id)]
    mock_clerk.users.update_metadata_async.side_effect = RuntimeError(secret)
    request = BulkUpdateUserRolesRequest(user_ids=[str(user_id)], role="developer")

    with (
        patch.object(users, "clerk_client", mock_clerk),
        patch.object(users.settings, "webwhen_noauth", False),
    ):
        result = await users.bulk_update_user_roles(
            request=request,
            admin=mock_admin,
            db=mock_db,
        )

    assert secret not in repr(result)
    assert result == {
        "updated": 0,
        "failed": 1,
        "errors": [{"user_id": str(user_id), "error": "Failed to update role"}],
    }
