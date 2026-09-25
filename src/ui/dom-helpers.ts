/**
 * dom-helpers.ts — Typed DOM access helpers.
 */

export function $el(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export function $btn(id: string): HTMLButtonElement | null {
  return document.getElementById(id) as HTMLButtonElement | null;
}

export function $input(id: string): HTMLInputElement | null {
  return document.getElementById(id) as HTMLInputElement | null;
}

export function $select(id: string): HTMLSelectElement | null {
  return document.getElementById(id) as HTMLSelectElement | null;
}

export function setText(id: string, value: string | number): void {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

export function show(el: HTMLElement | null): void {
  if (el) el.style.display = "";
}

export function hide(el: HTMLElement | null): void {
  if (el) el.style.display = "none";
}

export function enable(btn: HTMLButtonElement | null): void {
  if (btn) btn.disabled = false;
}

export function disable(btn: HTMLButtonElement | null): void {
  if (btn) btn.disabled = true;
}
