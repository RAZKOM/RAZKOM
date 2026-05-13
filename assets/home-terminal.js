(function () {
  var session = document.querySelector('.term-session');
  var intro = document.querySelector('.term-intro');
  var shell = document.getElementById('term-shell');
  var historyEl = document.getElementById('term-shell-history');
  var input = document.getElementById('term-shell-input');
  var shellLine = shell && shell.querySelector('.term-shell-line');

  if (!session || !intro || !shell || !historyEl || !input || !shellLine) {
    return;
  }

  input.disabled = true;

  var prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  var INTRO_SESSION_KEY = 'razkom_home_intro_done';

  function introAlreadyDoneThisSession() {
    try {
      return window.sessionStorage.getItem(INTRO_SESSION_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function markIntroDoneThisSession() {
    try {
      window.sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    } catch (e) {}
  }

  var segments = [].slice.call(intro.querySelectorAll('.term-segment'));

  var fullCmdText = segments.map(function (seg) {
    var inp = seg.querySelector('.input');
    return inp ? inp.textContent : '';
  });

  var pendingTimers = [];

  function trackTimer(id) {
    if (id != null) {
      pendingTimers.push(id);
    }
    return id;
  }

  function clearPendingTimers() {
    for (var i = 0; i < pendingTimers.length; i++) {
      clearTimeout(pendingTimers[i]);
    }
    pendingTimers.length = 0;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  var introRunning = false;
  var skipIntro = false;

  function typeIntoShellInput(fullText, onDone) {
    var full =
      fullText != null && String(fullText).length ? String(fullText) : '';
    input.value = '';

    function finish() {
      onDone();
    }

    function scheduleNext() {
      if (skipIntro) {
        input.value = full;
        finish();
        return;
      }
      if (current >= full.length) {
        finish();
        return;
      }
      current += 1;
      input.value = full.slice(0, current);
      var delay = rand(26, 52);
      trackTimer(setTimeout(scheduleNext, delay));
    }

    var current = 0;
    var beforeFirstMs = rand(45, 95);
    trackTimer(
      setTimeout(function () {
        scheduleNext();
      }, beforeFirstMs)
    );
  }

  function clonePrompt() {
    var p = shellLine.querySelector('.prompt');
    return p ? p.cloneNode(true) : null;
  }

  function scrollShell() {
    if (!shellLine) {
      return;
    }
    shellLine.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }

  function appendExecutedCommand(lineStr) {
    var row = document.createElement('div');
    row.className = 'cmd term-shell-echo';
    var pr = clonePrompt();
    if (pr) {
      row.appendChild(pr);
    }
    var span = document.createElement('span');
    span.className = 'input';
    span.textContent = lineStr;
    row.appendChild(span);
    historyEl.appendChild(row);
    scrollShell();
  }

  function appendShellOut(text, isErr) {
    var o = document.createElement('div');
    o.className = isErr
      ? 'out term-shell-msg term-shell-msg--err'
      : 'out term-shell-msg';
    o.textContent = text;
    historyEl.appendChild(o);
    scrollShell();
  }

  function appendPlainOutput(text, wrapId) {
    var wrap = document.createElement('div');
    wrap.className = 'term-shell-out term-shell-out--plain';
    if (wrapId) {
      wrap.id = wrapId;
    }
    var pre = document.createElement('pre');
    pre.className = 'term-shell-plain';
    pre.textContent = text;
    wrap.appendChild(pre);
    historyEl.appendChild(wrap);
    scrollShell();
  }

  function appendStdoutClone(node) {
    var wrap = document.createElement('div');
    wrap.className = 'term-shell-out';
    wrap.appendChild(node);
    historyEl.appendChild(wrap);
    scrollShell();
  }

  function getStdoutClone(segmentIndex, options) {
    var seg = segments[segmentIndex];
    if (!seg) {
      return null;
    }
    var src = seg.querySelector('.term-stdout');
    if (!src) {
      return null;
    }
    var deferApps = options && options.deferAppsReveal;
    var c = src.cloneNode(true);
    c.removeAttribute('hidden');
    c.classList.add('term-stdout', 'term-stdout--clone');
    var appLists = c.querySelectorAll('.apps-list');
    for (var i = 0; i < appLists.length; i++) {
      if (!deferApps) {
        appLists[i].classList.add('apps-revealed');
      }
    }
    return c;
  }

  function revealAppsInWrap(wrap) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var lists = wrap.querySelectorAll('.apps-list');
        for (var i = 0; i < lists.length; i++) {
          lists[i].classList.add('apps-revealed');
        }
      });
    });
  }

  function appendStdoutFromTemplate(segmentIndex, deferAppsReveal) {
    var c = getStdoutClone(segmentIndex, { deferAppsReveal: !!deferAppsReveal });
    if (!c) {
      return;
    }
    var wrap = document.createElement('div');
    wrap.className = 'term-shell-out';
    wrap.appendChild(c);
    historyEl.appendChild(wrap);
    if (deferAppsReveal) {
      revealAppsInWrap(wrap);
    }
    scrollShell();
  }

  function showIntroStatic() {
    historyEl.innerHTML = '';
    input.value = '';
    for (var i = 0; i < segments.length; i++) {
      appendExecutedCommand(fullCmdText[i]);
      appendStdoutFromTemplate(i, false);
    }
    session.classList.remove('term-anim');
  }

  function startShell() {
    input.disabled = false;
    input.focus();
  }

  function runIntroSequence() {
    introRunning = true;
    skipIntro = false;
    historyEl.innerHTML = '';
    input.value = '';
    session.classList.add('term-anim');
    session.setAttribute('aria-busy', 'true');

    function cleanupListeners() {
      document.removeEventListener('keydown', onSkipKey, true);
      introRunning = false;
    }

    function doneIntro() {
      clearPendingTimers();
      cleanupListeners();
      session.classList.remove('term-anim');
      session.removeAttribute('aria-busy');
      markIntroDoneThisSession();
      startShell();
    }

    function onSkipKey(ev) {
      if (!introRunning) {
        return;
      }
      if (ev.key !== 'Escape') {
        return;
      }
      ev.preventDefault();
      skipIntro = true;
      clearPendingTimers();
      showIntroStatic();
      doneIntro();
    }

    document.addEventListener('keydown', onSkipKey, true);

    function processSegment(idx) {
      if (skipIntro) {
        showIntroStatic();
        doneIntro();
        return;
      }
      if (idx >= segments.length) {
        doneIntro();
        return;
      }

      typeIntoShellInput(fullCmdText[idx], function afterTyped() {
        if (skipIntro) {
          showIntroStatic();
          doneIntro();
          return;
        }
        trackTimer(
          setTimeout(function () {
            if (skipIntro) {
              showIntroStatic();
              doneIntro();
              return;
            }
            var line = fullCmdText[idx];
            appendExecutedCommand(line);
            input.value = '';

            var deferApps = idx === 2;
            appendStdoutFromTemplate(idx, deferApps);

            trackTimer(
              setTimeout(function () {
                processSegment(idx + 1);
              }, rand(100, 220))
            );
          }, rand(160, 280))
        );
      });
    }

    trackTimer(
      setTimeout(function () {
        processSegment(0);
      }, 450)
    );
  }

  function normalizeCmd(s) {
    return s.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function parseLs(line) {
    var norm = normalizeCmd(line);
    var parts = norm.split(' ');
    if (parts[0] !== 'ls') {
      return null;
    }
    var showAll = false;
    var longFmt = false;
    var paths = [];
    for (var i = 1; i < parts.length; i++) {
      var p = parts[i];
      if (!p.length) {
        continue;
      }
      if (p[0] === '-' && p.length > 1) {
        for (var j = 1; j < p.length; j++) {
          var ch = p.charAt(j);
          if (ch === 'a') {
            showAll = true;
          }
          if (ch === 'l') {
            longFmt = true;
          }
        }
      } else {
        paths.push(p);
      }
    }
    var path = paths.length ? paths[paths.length - 1].replace(/\/+$/, '') : '';
    return { path: path, showAll: showAll, longFmt: longFmt };
  }

  function isHomePath(path) {
    return path === '.' || path === '~';
  }

  function tryParseCd(line) {
    var norm = normalizeCmd(line);
    var parts = norm.split(' ');
    if (parts[0] !== 'cd') {
      return null;
    }
    if (parts.length === 1) {
      return { kind: 'cd', target: '' };
    }
    if (parts.length > 2) {
      return { kind: 'cd_err', msg: 'cd: too many arguments' };
    }
    return { kind: 'cd', target: parts[1] };
  }

  function normalizeCdTarget(raw) {
    var t = (raw || '').trim().replace(/\/+$/, '');
    while (t.indexOf('./') === 0) {
      t = t.slice(2);
    }
    if (t.indexOf('~/') === 0) {
      t = t.slice(2);
    }
    if (t.charAt(0) === '/') {
      t = t.replace(/^\/+/, '');
    }
    return t.replace(/\/+$/, '');
  }

  function scrollTermHome() {
    var smooth = !prefersReducedMotion;
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: smooth ? 'smooth' : 'auto',
    });
    if (history.replaceState && location.hash) {
      history.replaceState(null, '', location.pathname + location.search);
    }
    scrollShell();
  }

  var CD_PAGE_PATHS = {
    tapt: '/tapt/',
    authforge: '/authforge/',
    blindspot: '/blindspot/',
    filelens: '/filelens/',
    jsdecloak: '/jsdecloak/',
  };

  var TAB_COMMANDS = [
    'cat',
    'cd',
    'clear',
    'help',
    'ls',
    'pwd',
    'whoami',
  ];

  var TAB_CAT_FILES = ['manifesto.txt', 'secrets.txt'];

  function uniqPrefixMatches(items, prefixLower) {
    var matches = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (
        !prefixLower ||
        it.toLowerCase().indexOf(prefixLower) === 0
      ) {
        matches.push(it);
      }
    }
    return matches;
  }

  function tryTabComplete() {
    var raw = input.value;
    var lead = (raw.match(/^\s*/) || [''])[0];
    var trail = (raw.match(/\s*$/) || [''])[0];
    var core = raw.slice(lead.length, raw.length - trail.length);

    if (!core.length) {
      return false;
    }

    var fs = core.search(/\s/);
    if (fs === -1) {
      var cmdPrefix = core;
      var cpl = cmdPrefix.toLowerCase();
      var cmdMatches = uniqPrefixMatches(TAB_COMMANDS, cpl);
      if (cmdMatches.length !== 1) {
        return false;
      }
      var fullCmd = cmdMatches[0];
      if (fullCmd.toLowerCase() === cpl) {
        return false;
      }
      input.value = lead + fullCmd + trail;
      return true;
    }

    var cmdPart = core.slice(0, fs);
    var rest = core.slice(fs);
    var gapM = rest.match(/^(\s+)(.*)$/);
    if (!gapM) {
      return false;
    }
    var gap = gapM[1];
    var argContent = gapM[2];
    var cmdLower = cmdPart.toLowerCase();

    if (cmdLower === 'cat') {
      var argParts = argContent.split(/\s+/).filter(function (p) {
        return p.length > 0;
      });
      if (!argParts.length) {
        return false;
      }
      var partial = argParts[argParts.length - 1];
      var apl = partial.toLowerCase();
      var fileMatches = uniqPrefixMatches(TAB_CAT_FILES, apl);
      if (fileMatches.length !== 1) {
        return false;
      }
      var fullFile = fileMatches[0];
      if (fullFile.toLowerCase() === partial.toLowerCase()) {
        return false;
      }
      var fixed = argParts.slice(0, -1);
      var newArg =
        (fixed.length ? fixed.join(' ') + ' ' : '') + fullFile;
      input.value = lead + cmdPart + gap + newArg + trail;
      return true;
    }

    if (cmdLower === 'cd') {
      var cdParts = argContent.split(/\s+/).filter(function (p) {
        return p.length > 0;
      });
      if (!cdParts.length) {
        return false;
      }
      if (cdParts.length > 1) {
        return false;
      }
      var cdPartial = cdParts[0];
      var dpl = cdPartial.toLowerCase();
      var cdKeys = Object.keys(CD_PAGE_PATHS);
      var cdMatches = uniqPrefixMatches(cdKeys, dpl);
      if (cdMatches.length !== 1) {
        return false;
      }
      var fullDir = cdMatches[0];
      if (fullDir.toLowerCase() === dpl) {
        return false;
      }
      input.value = lead + cmdPart + gap + fullDir + trail;
      return true;
    }

    return false;
  }

  function runCd(rawTarget) {
    var key = normalizeCdTarget(rawTarget || '');
    if (!key || key === '~' || key === '.' || key === '/') {
      scrollTermHome();
      return;
    }
    if (key === '..') {
      scrollTermHome();
      return;
    }
    var href = CD_PAGE_PATHS[key];
    if (href) {
      window.location.assign(href);
      return;
    }
    appendShellOut('cd: ' + key + ': No such file or directory', true);
  }

  var LS_DATE = 'May 08 2026';

  var HOME_APP_DIRS = [
    'tapt/',
    'authforge/',
    'blindspot/',
    'filelens/',
    'jsdecloak/',
  ];

  function appendShellPre(text) {
    appendPlainOutput(text);
  }

  function runLsHome(parsed) {
    var showAll = parsed.showAll;
    var longFmt = parsed.longFmt;

    if (longFmt) {
      var lines = ['total 32'];
      if (showAll) {
        lines.push(
          'drwxr-xr-x  2 user razkom 4096 ' +
            LS_DATE +
            ' .',
          'drwxr-xr-x  2 user razkom 4096 ' +
            LS_DATE +
            ' ..',
          '-rw-r--r--  1 user razkom    0 ' +
            LS_DATE +
            ' .hushlogin'
        );
      }
      for (var di = 0; di < HOME_APP_DIRS.length; di++) {
        lines.push(
          'drwxr-xr-x  2 user razkom 4096 ' +
            LS_DATE +
            ' ' +
            HOME_APP_DIRS[di]
        );
      }
      lines.push(
        '-rw-r--r--  1 user razkom  128 ' + LS_DATE + ' manifesto.txt'
      );
      if (showAll) {
        lines.push(
          '-rw-------  1 user razkom   96 ' +
            LS_DATE +
            ' secrets.txt'
        );
      }
      appendShellPre(lines.join('\n'));
      return;
    }

    var short = [];
    if (showAll) {
      short.push('.', '..', '.hushlogin');
    }
    for (var si = 0; si < HOME_APP_DIRS.length; si++) {
      short.push(HOME_APP_DIRS[si]);
    }
    short.push('manifesto.txt');
    if (showAll) {
      short.push('secrets.txt');
    }
    appendShellPre(short.join('\n'));
  }

  function appendHelpPanel() {
    var text = [
      'Usage:',
      '  cat FILE',
      '      Print FILE to standard output.',
      '  cd [PATH]',
      '      Change directory. Omit PATH for home.',
      '  clear',
      '      Clear the screen.',
      '  help, ?, -h, --help',
      '      Print this synopsis.',
      '  ls [-al] [PATH]',
      '      List directory. -a hidden; -l long; PATH defaults to .',
      '  pwd',
      '      Print working directory.',
      '  whoami',
      '      Print effective user name.',
    ].join('\n');
    appendPlainOutput(text);
  }

  function runInteractiveCommand(raw) {
    var line = raw.trim();
    appendExecutedCommand(line);

    if (!line) {
      return;
    }

    var k = normalizeCmd(line);

    if (k === 'clear') {
      historyEl.innerHTML = '';
      scrollShell();
      return;
    }

    if (k === 'help' || k === '?' || k === '-h' || k === '--help') {
      appendHelpPanel();
      return;
    }

    if (k === 'pwd') {
      appendShellPre('/home/user');
      return;
    }

    var cdCmd = tryParseCd(line);
    if (cdCmd) {
      if (cdCmd.kind === 'cd_err') {
        appendShellOut(cdCmd.msg, true);
        return;
      }
      runCd(cdCmd.target);
      return;
    }

    if (k === 'whoami') {
      var c0 = getStdoutClone(0);
      if (c0) {
        appendStdoutClone(c0);
      }
      return;
    }

    var catTok = normalizeCmd(line).split(/\s+/);
    if (catTok[0] === 'cat') {
      var catArg = catTok.slice(1).join(' ').trim();
      if (!catArg) {
        appendShellOut('cat: missing operand', true);
        return;
      }
      if (catArg === 'manifesto.txt') {
        var c1 = getStdoutClone(1);
        if (c1) {
          appendStdoutClone(c1);
        }
        return;
      }
      if (catArg === 'secrets.txt') {
        appendShellPre(
          [
            '# classified razkom intelligence dump',
            '',
            'TOP_SECRET=4afdc73c8947ceb6d39bdbfa57accaeb63bf7f40504c17593eb184321b45de5e',
          ].join('\n')
        );
        return;
      }
      appendShellOut('cat: ' + catArg + ': No such file or directory', true);
      return;
    }

    var lsParsed = parseLs(line);
    if (lsParsed) {
      if (!lsParsed.path || isHomePath(lsParsed.path)) {
        runLsHome(lsParsed);
        return;
      }
      appendShellOut(
        "ls: cannot access '" + lsParsed.path + "': No such file or directory",
        true
      );
      return;
    }

    appendShellOut('bash: ' + line + ': command not found', true);
  }

  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Tab') {
      ev.preventDefault();
      tryTabComplete();
      return;
    }
    if (ev.key !== 'Enter') {
      return;
    }
    ev.preventDefault();
    var v = input.value;
    input.value = '';
    runInteractiveCommand(v);
  });

  if (prefersReducedMotion) {
    showIntroStatic();
    startShell();
    markIntroDoneThisSession();
    return;
  }

  if (introAlreadyDoneThisSession()) {
    showIntroStatic();
    startShell();
    return;
  }

  runIntroSequence();
})();
