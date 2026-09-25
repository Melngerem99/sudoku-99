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
  private handler: ((e: KeyboardEvent) => void) | null = null;

  constructor(opts: FocusTrapOptions) {
    this.container = opts.container;
    this.onEscape = opts.onEscape;
  }

  /**
   * Activate the trap: move focus to the first focusable element inside the
   * container and attach the keydown handler.
   */
  activate(): void {
    const focusable = this.getFocusable();
    focusable[0]?.focus();

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
   * Does NOT move focus — the caller is responsible for returning focus to the
   * trigger element after calling deactivate().
   */
  deactivate(): void {
    if (this.handler) {
      this.container.removeEventListener('keydown', this.handler);
      this.handler = null;
    }
  }

  /**
   * Returns the list of currently focusable elements inside the container,
   * excluding descendants of `[aria-hidden="true"]` sub-trees.
   */
  private getFocusable(): HTMLElement[] {
    const candidates = Array.from(
      this.container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
    );
    return candidates.filter((el) => !this.isInsideAriaHidden(el));
  }

  /**
   * Returns true if `el` is a descendant of an `[aria-hidden="true"]` element
   * that is itself inside the container.
   */
  private isInsideAriaHidden(el: HTMLElement): boolean {
    let node: HTMLElement | null = el.parentElement;
    while (node && node !== this.container) {
      if (node.getAttribute('aria-hidden') === 'true') return true;
      node = node.parentElement;
    }
    return false;
  }
}
