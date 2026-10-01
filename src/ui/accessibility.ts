/**
 * accessibility.ts — Shared accessibility utilities.
 *
 * Provides:
 *   - announce()          : writes to assertive / polite live regions
 *   - setAppAriaHidden()  : hides/shows #app from assistive technology
 *   - FocusTrap           : constrains Tab/Shift+Tab focus within a container
 */

// ---------------------------------------------------------------------------
// Live-region announcement
// ---------------------------------------------------------------------------

let assertiveEl: HTMLElement | null = null;
let politeEl: HTMLElement | null = null;

/**
 * Announce a message via the appropriate ARIA live region.
 *
 * Uses the double-write pattern (clear → requestAnimationFrame → set) so that
 * identical consecutive strings still trigger a new announcement in all
 * major screen readers.
 *
 * @param msg         The string to announce.
 * @param politeness  'assertive' (default) → #sr-announce;
 *                    'polite'              → #sr-status.
 */
export function announce(
  msg: string,
  politeness: 'assertive' | 'polite' = 'assertive',
): void {
  const el =
    politeness === 'polite'
      ? (politeEl ??= document.getElementById('sr-status'))
      : (assertiveEl ??= document.getElementById('sr-announce'));

  if (!el) return;

  // Double-write forces re-announcement even when the string is unchanged.
  el.textContent = '';
  requestAnimationFrame(() => {
    el.textContent = msg;
  });
}

// ---------------------------------------------------------------------------
// App-level aria-hidden
// ---------------------------------------------------------------------------

/**
 * Set `aria-hidden` on `#app` to hide (or restore) the main content from
 * assistive technology while a modal / dialog is open.
 *
 * @param hidden  true  → `aria-hidden="true"`  (dialog open)
 *                false → `aria-hidden="false"` (dialog closed)
 */
export function setAppAriaHidden(hidden: boolean): void {
  document.getElementById('app')?.setAttribute('aria-hidden', String(hidden));
}

// ---------------------------------------------------------------------------
// FocusTrap
// ---------------------------------------------------------------------------

/** Selectors for elements that can receive keyboard focus. */
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'details > summary',
].join(', ');

export interface FocusTrapOptions {
  /** The dialog / panel element whose focusable descendants are to be trapped. */
  container: HTMLElement;
  /** Called when the user presses Escape inside the trap. */
  onEscape?: () => void;
  /** Hide and inert the app and other dialogs while this dialog is active. */
  isolateBackground?: boolean;
  /** Restore focus to the element active when the trap was activated. */
  restoreFocus?: boolean;
}

/**
 * FocusTrap constrains Tab / Shift+Tab focus to the focusable elements inside
 * a container (e.g., a modal or panel).
 *
 * Usage:
 *   const trap = new FocusTrap({ container: panelEl, onEscape: close });
 *   trap.activate();   // on panel open
 *   trap.deactivate(); // on panel close
 */
export class FocusTrap {
  private readonly container: HTMLElement;
  private readonly onEscape: (() => void) | undefined;
  private readonly isolateBackground: boolean;
  private readonly restoreFocus: boolean;
  private handler: ((e: KeyboardEvent) => void) | null = null;
  private returnFocus: HTMLElement | null = null;
  private appState: { ariaHidden: string | null; inert: boolean } | null = null;
  private dialogStates: Array<{ element: HTMLElement; ariaHidden: string | null; inert: boolean }> = [];
  private containerTabIndex: string | null = null;
  private containerTabIndexChanged = false;
  private containerInert: boolean | null = null;

  constructor(opts: FocusTrapOptions) {
    this.container = opts.container;
    this.onEscape = opts.onEscape;
    this.isolateBackground = opts.isolateBackground ?? false;
    this.restoreFocus = opts.restoreFocus ?? false;
  }

  /**
   * Activate the trap: move focus to the first focusable element inside the
   * container and attach the keydown handler.
   */
  activate(): void {
    if (this.handler) return;

    if (this.restoreFocus) {
      const active = document.activeElement as HTMLElement | null;
      this.returnFocus = active && active !== document.body ? active : null;
    }

    if (this.isolateBackground) this.isolatePageBackground();

    const focusable = this.getFocusable();
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      this.containerTabIndex = this.container.getAttribute('tabindex');
      this.container.setAttribute('tabindex', '-1');
      this.containerTabIndexChanged = true;
      this.container.focus();
    }

    this.handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.onEscape?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const elements = this.getFocusable();
      if (elements.length === 0) {
        e.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab from first → wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab from last → wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    this.container.addEventListener('keydown', this.handler);
  }

  /**
   * Deactivate the trap: remove the keydown handler.
  * Restores focus only when `restoreFocus` was enabled for this trap.
   */
  deactivate(): void {
    if (this.handler) {
      this.container.removeEventListener('keydown', this.handler);
      this.handler = null;
    }

    if (this.containerTabIndexChanged) {
      if (this.containerTabIndex === null) this.container.removeAttribute?.('tabindex');
      else this.container.setAttribute('tabindex', this.containerTabIndex);
      this.containerTabIndex = null;
      this.containerTabIndexChanged = false;
    }

    this.restorePageBackground();

    const returnFocus = this.returnFocus;
    this.returnFocus = null;
    if (returnFocus?.isConnected && !this.isUnavailable(returnFocus)) returnFocus.focus();
  }

  /**
   * Returns the list of currently focusable elements inside the container,
   * excluding descendants of `[aria-hidden="true"]` sub-trees.
   */
  private getFocusable(): HTMLElement[] {
    const candidates = Array.from(
      this.container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
    );
    return candidates.filter((el) => !this.isUnavailable(el));
  }

  private isUnavailable(el: HTMLElement): boolean {
    let node: HTMLElement | null = el;
    while (node && node !== this.container) {
      if (node.hidden || node.inert || node.getAttribute('aria-hidden') === 'true') return true;
      node = node.parentElement;
    }
    return false;
  }

  private isolatePageBackground(): void {
    this.containerInert = this.container.inert;
    this.container.inert = false;

    const app = document.getElementById('app');
    if (app) {
      this.appState = { ariaHidden: app.getAttribute('aria-hidden'), inert: app.inert };
      app.setAttribute('aria-hidden', 'true');
      app.inert = true;
    }

    this.dialogStates = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'))
      .filter((dialog) => dialog !== this.container && !this.isAncestor(dialog, this.container))
      .map((dialog) => {
        const state = { element: dialog, ariaHidden: dialog.getAttribute('aria-hidden'), inert: dialog.inert };
        dialog.setAttribute('aria-hidden', 'true');
        dialog.inert = true;
        return state;
      });
  }

  private restorePageBackground(): void {
    this.dialogStates.forEach(({ element, ariaHidden, inert }) => {
      if (ariaHidden === null) element.removeAttribute('aria-hidden');
      else element.setAttribute('aria-hidden', ariaHidden);
      element.inert = inert;
    });
    this.dialogStates = [];

    const app = document.getElementById('app');
    if (app && this.appState) {
      if (this.appState.ariaHidden === null) app.removeAttribute('aria-hidden');
      else app.setAttribute('aria-hidden', this.appState.ariaHidden);
      app.inert = this.appState.inert;
    }
    this.appState = null;

    if (this.containerInert !== null) {
      this.container.inert = this.containerInert;
      this.containerInert = null;
    }
  }

  private isAncestor(ancestor: HTMLElement, element: HTMLElement): boolean {
    let node = element.parentElement;
    while (node) {
      if (node === ancestor) return true;
      node = node.parentElement;
    }
    return false;
  }
}
