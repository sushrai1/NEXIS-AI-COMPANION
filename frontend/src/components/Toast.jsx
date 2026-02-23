// src/components/Toast.jsx
// A lightweight toast notification system.
// Usage: wrap your app (or Layout) in <ToastProvider>, then call useToast() to show notifications.

import { createContext, useContext, useState, useCallback } from "react";
import {
    CheckCircleIcon,
    XCircleIcon,
    InformationCircleIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

const ToastContext = createContext(null);

let _id = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const show = useCallback((message, type = "info", duration = 3500) => {
        const id = ++_id;
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
    }, []);

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={show}>
            {children}
            {/* Toast container */}
            <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onDismiss }) {
    const styles = {
        success: {
            container: "bg-green-50 border-green-200 text-green-800",
            icon: <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />,
        },
        error: {
            container: "bg-red-50 border-red-200 text-red-800",
            icon: <XCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />,
        },
        info: {
            container: "bg-sky-50 border-sky-200 text-sky-800",
            icon: <InformationCircleIcon className="h-5 w-5 text-sky-500 flex-shrink-0" />,
        },
    };

    const s = styles[toast.type] || styles.info;

    return (
        <div
            className={`flex items-start gap-3 border rounded-lg px-4 py-3 shadow-lg animate-slide-in ${s.container}`}
        >
            {s.icon}
            <p className="text-sm flex-1">{toast.message}</p>
            <button
                onClick={() => onDismiss(toast.id)}
                className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                aria-label="Dismiss"
            >
                <XMarkIcon className="h-4 w-4" />
            </button>
        </div>
    );
}

/** Call this hook anywhere inside <ToastProvider> to get a `toast(message, type)` function. */
export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
    return ctx;
}
