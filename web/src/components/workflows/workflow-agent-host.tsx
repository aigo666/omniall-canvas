"use client";

import { t } from "@/i18n";
import { Drawer } from "antd";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { WorkflowAgentFab } from "@/components/workflows/workflow-agent-fab";
import {
    CreativeWorkflowWorkspace,
    type WorkflowExternalTaskFailure,
    type WorkflowExternalTaskStart,
    type WorkflowExternalTaskSuccess,
} from "@/components/workflows/creative-workflow-workspace";

const WORKFLOW_BUTTON_POSITION_KEY = "infinite-canvas:workflow-button-position";

export const WORKFLOW_TASK_STARTED_EVENT = "infinite-canvas:workflow-task-started";
export const WORKFLOW_TASK_SUCCESS_EVENT = "infinite-canvas:workflow-task-success";
export const WORKFLOW_TASK_FAILURE_EVENT = "infinite-canvas:workflow-task-failure";
export const WORKFLOW_LOG_SAVED_EVENT = "infinite-canvas:workflow-log-saved";
export const WORKFLOW_VIDEO_SAVED_EVENT = "infinite-canvas:workflow-video-saved";

export function WorkflowAgentHost() {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const buttonRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);

    useEffect(() => {
        const restore = () => {
            try {
                const stored = JSON.parse(window.localStorage?.getItem(WORKFLOW_BUTTON_POSITION_KEY) || "null") as { x?: number; y?: number } | null;
                if (typeof stored?.x === "number" && typeof stored?.y === "number") setPosition(clampWorkflowButtonPosition(stored));
                else setPosition(defaultWorkflowButtonPosition());
            } catch {
                setPosition(defaultWorkflowButtonPosition());
            }
        };
        restore();
        const handleResize = () => setPosition((current) => clampWorkflowButtonPosition(current));
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const persist = (next: { x: number; y: number }) => {
        const clamped = clampWorkflowButtonPosition(next);
        setPosition(clamped);
        try {
            window.localStorage?.setItem(WORKFLOW_BUTTON_POSITION_KEY, JSON.stringify(clamped));
        } catch {
            // Keep the drag position in memory when localStorage is unavailable.
        }
    };

    const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const origin = position.x || position.y ? position : defaultWorkflowButtonPosition();
        dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: origin.x, originY: origin.y, moved: false };
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.moved = true;
        const nextPos = clampWorkflowButtonPosition({ x: drag.originX + dx, y: drag.originY + dy });
        if (buttonRef.current) {
            buttonRef.current.style.left = `${nextPos.x}px`;
            buttonRef.current.style.top = `${nextPos.y}px`;
        }
    };

    const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        event.currentTarget.releasePointerCapture(event.pointerId);
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        persist(clampWorkflowButtonPosition({ x: drag.originX + dx, y: drag.originY + dy }));
    };

    return (
        <>
            <WorkflowAgentFab
                ref={buttonRef}
                style={
                    position.x || position.y
                        ? { left: clampWorkflowButtonPosition(position).x, top: clampWorkflowButtonPosition(position).y }
                        : { visibility: "hidden" }
                }
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onClick={() => {
                    if (dragRef.current?.moved) {
                        dragRef.current = null;
                        return;
                    }
                    dragRef.current = null;
                    setOpen(true);
                }}
            />
            <Drawer title={t("创作工作流")} placement="right" size="min(1120px, 92vw)" open={open} onClose={() => setOpen(false)} styles={{ body: { padding: 0 } }} destroyOnHidden={false}>
                <CreativeWorkflowWorkspace
                    embedded
                    onWorkflowTaskStarted={(task) => window.dispatchEvent(new CustomEvent<WorkflowExternalTaskStart>(WORKFLOW_TASK_STARTED_EVENT, { detail: task }))}
                    onWorkflowTaskSuccess={(task) => window.dispatchEvent(new CustomEvent<WorkflowExternalTaskSuccess>(WORKFLOW_TASK_SUCCESS_EVENT, { detail: task }))}
                    onWorkflowTaskFailure={(task) => window.dispatchEvent(new CustomEvent<WorkflowExternalTaskFailure>(WORKFLOW_TASK_FAILURE_EVENT, { detail: task }))}
                    onGenerationLogSaved={() => window.dispatchEvent(new CustomEvent(WORKFLOW_LOG_SAVED_EVENT))}
                />
            </Drawer>
        </>
    );
}

function defaultWorkflowButtonPosition() {
    if (typeof window === "undefined") return { x: 24, y: 320 };
    return { x: Math.max(16, window.innerWidth - 76), y: Math.max(96, Math.round(window.innerHeight / 2)) };
}

function clampWorkflowButtonPosition(position: { x?: number; y?: number }) {
    if (typeof window === "undefined") return { x: Number(position.x) || 24, y: Number(position.y) || 320 };
    const size = 58;
    return {
        x: Math.min(Math.max(12, Number(position.x) || 12), Math.max(12, window.innerWidth - size - 12)),
        y: Math.min(Math.max(72, Number(position.y) || 72), Math.max(72, window.innerHeight - size - 12)),
    };
}
