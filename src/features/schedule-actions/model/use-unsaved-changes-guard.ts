import { useEffect } from "react";

export const UNSAVED_CHANGES_MESSAGE = "Есть несохранённые изменения. Уйти без сохранения?";

/**
 * Пока есть несохранённые правки: браузер спрашивает при закрытии вкладки и перезагрузке (`beforeunload`),
 * а переход по внутренним ссылкам приложения (меню, «назад») требует подтверждения.
 * Кнопку «назад» браузера внутри приложения (popstate) это не перехватывает.
 */
export function useUnsavedChangesGuard(active: boolean): void {
  useEffect(() => {
    if (!active) return undefined;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      // Внешние ссылки покрывает beforeunload; якорь на той же странице ничего не теряет.
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      // oxlint-disable-next-line no-alert
      if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    // Фаза перехвата: срабатывает раньше обработчика Link в React и может его отменить.
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active]);
}
