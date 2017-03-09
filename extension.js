const Meta = imports.gi.Meta;
const Mainloop = imports.mainloop;

function connect(object, signal, cb) {
  if (!object.__handles)
    object.__handles = [];
  object.__handles.push(object.connect(signal, cb));
}

function disconnect(object) {
  if (object.__handles)
    object.__handles.forEach(h => object.disconnect(h));
  delete object.__handles;
}

function normal(win) {
  return win.window_type === Meta.WindowType.NORMAL;
}

function place(win, {x, y, width, height}) {
  width -= 2 * (x += 0.3 * width);
  height -= 2 * (y += 0.2 * height);
  win.move_resize_frame(false, x, y, width, height);
}

function check(win) {
  let wins = win.get_workspace().list_windows().filter(normal);
  let top1 = global.display.sort_windows_by_stacking(wins).pop();
  let top2 = top1.get_tile_match() || top1;
  if (!top1.get_maximized() || top1.is_fullscreen())
    return;
  for (let w of wins.filter(w => w != top1 && w != top2)) {
    w.unmaximize(Meta.MaximizeFlags.BOTH);
    w.raise();
    let r = w.get_frame_rect();
    if ([top1, top2].map(t => t.get_frame_rect().intersect(r))
      .some(([b, i]) => i.area() > r.area() * 0.5))
      place(w, top1.get_work_area_current_monitor());
  }
}

function setup(win) {
  if (!normal(win))
    return;
  check(win);
  for (let s of ['raised', 'size-changed', 'position-changed', 'workspace-changed'])
    connect(win, s, () => Mainloop.idle_add(() => check(win)));
  connect(win, 'unmanaged', () => disconnect(win));
}

function enable() {
  global.get_window_actors().map(a => a.meta_window).forEach(setup);
  connect(global.display, 'window-created', (d, w) => setup(w));
}

function disable() {
  global.get_window_actors().map(a => a.meta_window).forEach(disconnect);
  disconnect(global.display);
}
