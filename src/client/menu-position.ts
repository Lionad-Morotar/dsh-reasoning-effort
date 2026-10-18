/** Closest horizontal bounds imposed by ancestors that clip overflow. */
function clippedBounds(node: HTMLElement): { left: number; right: number } | null {
  let left = Number.NEGATIVE_INFINITY
  let right = Number.POSITIVE_INFINITY
  let parent = node.parentElement
  while (parent !== null && parent !== document.body) {
    if (getComputedStyle(parent).overflowX !== 'visible') {
      const rect = parent.getBoundingClientRect()
      left = Math.max(left, rect.left)
      right = Math.min(right, rect.right)
    }
    parent = parent.parentElement
  }
  return left <= right ? { left, right } : null
}

/** Keep the composer popover inside the visible viewport without measuring its entrance animation. */
export function positionModelMenu(root: HTMLElement, menu: HTMLElement): () => void {
  const viewport = window.visualViewport
  const update = () => {
    const margin = 12
    const viewLeft = (viewport?.offsetLeft ?? 0) + margin
    const viewTop = (viewport?.offsetTop ?? 0) + margin
    let left = viewLeft
    let right = viewLeft + Math.max(0, (viewport?.width ?? document.documentElement.clientWidth) - margin * 2)
    const height = Math.max(0, (viewport?.height ?? window.innerHeight) - margin * 2)

    // The menu is absolutely positioned inside the composer column and that
    // column clips overflow, so honour both the visual viewport and every
    // clipping ancestor. Without this the left edge of the popover is cut off
    // in narrow windows.
    const clip = clippedBounds(menu)
    if (clip !== null) {
      left = Math.max(left, clip.left)
      right = Math.min(right, clip.right)
    }
    const width = Math.max(0, right - left)

    const anchor = root.getBoundingClientRect()
    const bottom = anchor.top - 8
    const above = bottom - viewTop
    menu.style.setProperty('--re-menu-width', `${width}px`)
    menu.style.setProperty('--re-menu-height', `${Math.min(480, above >= 120 ? Math.min(above, height) : height)}px`)

    // offsetWidth/Height exclude transforms, so repeated updates cannot accumulate
    // an animated scale or an earlier correction into the next position.
    const baseLeft = anchor.right - menu.offsetWidth
    const baseTop = bottom - menu.offsetHeight
    const x = Math.max(left, Math.min(baseLeft, right - menu.offsetWidth))
    const y = Math.max(viewTop, Math.min(baseTop, viewTop + height - menu.offsetHeight))
    menu.style.setProperty('--re-menu-x', `${x - baseLeft}px`)
    menu.style.setProperty('--re-menu-y', `${y - baseTop}px`)
  }

  update()
  const observer = new ResizeObserver(update)
  observer.observe(root)
  observer.observe(menu)
  window.addEventListener('resize', update)
  window.addEventListener('scroll', update, true)
  viewport?.addEventListener('resize', update)
  viewport?.addEventListener('scroll', update)
  return () => {
    observer.disconnect()
    window.removeEventListener('resize', update)
    window.removeEventListener('scroll', update, true)
    viewport?.removeEventListener('resize', update)
    viewport?.removeEventListener('scroll', update)
  }
}
