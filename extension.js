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

function windowIsNormal(win) {
  return win.window_type === Meta.WindowType.NORMAL;
}

function windowPlace(win) {
  let {x, y, width, height} = win.get_work_area_current_monitor();
  width -= 2 * (x += 0.3 * width);
  height -= 2 * (y += 0.2 * height);
  win.move_resize_frame(false, x, y, width, height);
}

function workspaceTopWindows(ws) {
  let tops = [];
  let wins = ws.list_windows().filter(windowIsNormal);
  let t1 = global.display.sort_windows_by_stacking(wins).pop();
  if (!t1 || t1.is_fullscreen() || !t1.get_maximized())
    return [tops, wins];
  tops.push(t1);
  if (t1.get_maximized() === Meta.MaximizeFlags.BOTH)
    return [tops, wins.filter(w => tops.indexOf(w) === -1)];
  let t2 = wins.filter(w => w != t1)
    .filter(w => w.get_maximized() === Meta.MaximizeFlags.VERTICAL)
    .filter(w => w.get_frame_rect()
      .union(t1.get_frame_rect())
      .contains_rect(t1.get_work_area_current_monitor()))
    .pop();
  if (t2)
    tops.push(t2);
  return [tops, wins.filter(w => tops.indexOf(w) === -1)];
}

function workspaceCheck(ws) {
  let [tops, wins] = workspaceTopWindows(ws);
  if (!tops.length)
    return;
  for (let w of wins) {
    w.unmaximize(Meta.MaximizeFlags.BOTH);
    w.raise();
    let rect = w.get_frame_rect();
    let ints = tops.map(t => t.get_frame_rect().intersect(rect)[1]);
    if (ints.some(int => int.area() > rect.area() * 0.5))
      windowPlace(w);
  }
}

function windowSetup(win) {
  if (!windowIsNormal(win))
    return;
  workspaceCheck(win.get_workspace());
  for (let s of ['raised', 'size-changed', 'position-changed', 'workspace-changed'])
    connect(win, s, () => workspaceCheck(win.get_workspace()));
  connect(win, 'unmanaged', () => disconnect(win));
}

function enable() {
  global.get_window_actors().map(a => a.meta_window).forEach(windowSetup);
  connect(global.display, 'window-created', (d, w) => windowSetup(w));
}

function disable() {
  global.get_window_actors().map(a => a.meta_window).forEach(disconnect);
  disconnect(global.display);
}
