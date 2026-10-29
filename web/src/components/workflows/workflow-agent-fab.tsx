"use client";

import { t } from "@/i18n";
import { forwardRef, useCallback, type ButtonHTMLAttributes } from "react";

import styles from "./workflow-agent-fab.module.css";

type WorkflowAgentFabProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    busy?: boolean;
};

export const WorkflowAgentFab = forwardRef<HTMLDivElement, WorkflowAgentFabProps>(function WorkflowAgentFab(
    { busy = false, className = "", style, ...props },
    ref,
) {
    const setAnchor = useCallback((node: HTMLDivElement | null) => {
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
    }, [ref]);

    return (
        <div ref={setAnchor} className={styles.anchor} style={style}>
            <button
                type="button"
                aria-label={t("创作工作流")}
                title={t("创作工作流")}
                className={`${styles.fab} ${busy ? styles.busy : ""} ${className}`.trim()}
                {...props}
            >
                <span className={styles.shell} aria-hidden>
                    <span className={styles.antenna}>
                        <span className={styles.antennaTip} />
                    </span>
                    <span className={styles.face}>
                        <span className={styles.eye}>
                            <span className={styles.pupil} />
                            <span className={styles.glint} />
                        </span>
                        <span className={styles.eye}>
                            <span className={styles.pupil} />
                            <span className={styles.glint} />
                        </span>
                    </span>
                    <span className={styles.cheek} />
                    <span className={styles.cheekRight} />
                    <span className={styles.plate} />
                </span>
            </button>
        </div>
    );
});
