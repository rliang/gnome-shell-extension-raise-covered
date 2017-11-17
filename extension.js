const Meta = imports.gi.Meta;

function check() {
  let wins = global.display.sort_windows_by_stacking(global.screen.get_active_workspace().list_windows()).reverse();
  if (!wins.length || wins.some(w => w.is_fullscreen()))
    return;
  let rect = wins.shift().get_frame_rect();
  for (let w of wins) {
    let r = w.get_frame_rect();
    if (rect.contains_rect(r)) {
      w.unmaximize(Meta.MaximizeFlags.BOTH);
      if (!rect.equal(r))
        w.raise();
    }
    rect = rect.union(r);
  }
}

let _handles_sc = [];
let _handles_wm = [];

function enable() {
  _handles_sc = ['workspace-switched', 'restacked']
    .map(s => global.screen.connect(s, () => Meta.later_add(0, check)));
  _handles_wm = ['map', 'size-change', 'size-changed']
    .map(s => global.window_manager.connect(s, () => Meta.later_add(0, check)));
}

function disable() {
  for (let h of _handles_sc)
    global.screen.disconnect(h);
  for (let h of _handles_wm)
    global.window_manager.disconnect(h);
}
