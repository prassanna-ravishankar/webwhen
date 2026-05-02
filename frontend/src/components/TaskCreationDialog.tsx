import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ConnectorPickerSection } from "@/components/connectors/ConnectorPickerSection";
import type { Task } from "@/types";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn, getErrorMessage } from "@/lib/utils";
import styles from "./composer/Composer.module.css";
import landing from "./landing/Landing.module.css";

interface TaskCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: (task: Task) => void;
}

const MIN_INSTRUCTIONS_LENGTH = 10;

export const TaskCreationDialog: React.FC<TaskCreationDialogProps> = ({
  open,
  onOpenChange,
  onTaskCreated,
}) => {
  const [condition, setCondition] = useState("");
  const [attachedConnectors, setAttachedConnectors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setCondition("");
      setAttachedConnectors([]);
      setError("");
    }
  }, [open]);

  const handleSubmit = async () => {
    const trimmed = condition.trim();
    if (!trimmed) {
      toast.error("describe what to watch for");
      return;
    }
    if (trimmed.length < MIN_INSTRUCTIONS_LENGTH) {
      toast.error("a little more detail, please");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      // Backend/agent derives the name from the condition; no explicit name field.
      const newTask = await api.createTask({
        search_query: trimmed,
        condition_description: trimmed,
        state: "active",
        run_immediately: true,
        attached_connector_slugs: attachedConnectors,
      });

      onTaskCreated(newTask);
      onOpenChange(false);
    } catch (err) {
      const msg = getErrorMessage(err, "failed to create watch");
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = condition.trim().length > 0 && !submitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.modal}>
        {/* Visually-hidden title/description for a11y (Radix requires DialogTitle) */}
        <DialogTitle className="sr-only">New watch</DialogTitle>
        <DialogDescription className="sr-only">
          Describe the condition you want to watch for in plain English.
        </DialogDescription>

        <div className={styles.head}>
          <span className={styles.headTitle}>new watch · plain english · no rules</span>
          <button
            type="button"
            className={styles.headClose}
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.conditionLabel}>The condition</div>
          <textarea
            className={cn(styles.conditionInput, "posthog-no-capture")}
            placeholder="Tell me when the next iPhone release date is announced."
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            disabled={submitting}
            autoFocus
          />

          <div className={styles.connectorBlock}>
            <ConnectorPickerSection
              selected={attachedConnectors}
              onChange={setAttachedConnectors}
              disabled={submitting}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.foot}>
          <span className={styles.footHint}>
            the agent decides cadence + when to notify
          </span>
          <div className={styles.footActions}>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className={cn(landing.btn, landing.btnSecondary)}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(landing.btn, landing.btnPrimary)}
            >
              {submitting ? "Creating…" : "Watch →"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
