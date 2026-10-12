(function () {
  'use strict';

  // Outbound AuthForge links carry the affiliate code plus UTM tags so
  // razkom.com shows up in AuthForge's first-touch attribution.
  var AUTHFORGE_URL =
    'https://authforge.cc/?ref=razkom&utm_source=razkom.com&utm_medium=referral&utm_campaign=shell';

  var APPS = {
    tapt: '/tapt/',
    authforge: AUTHFORGE_URL,
    blindspot: '/blindspot/',
    filelens: '/filelens/',
    jsdecloak: '/jsdecloak/',
    tape: '/tape/',
  };
  var APP_NAMES = Object.keys(APPS);

  var FILES = {
    'manifesto.txt': [
      'Small tools. Native binaries. One thing well.',
      'Some free, some paid. Never subscriptions.',
      "If it helps you, that's the goal.",
    ].join('\n'),
    // Proof of identity: SHA-256 of the owner's personal email.
    'secrets.txt': [
      '# classified razkom intelligence dump',
      '',
      'TOP_SECRET=4afdc73c8947ceb6d39bdbfa57accaeb63bf7f40504c17593eb184321b45de5e',
    ].join('\n'),
  };

  var COMMANDS = ['cat', 'cd', 'clear', 'exit', 'help', 'ls', 'pwd', 'whoami'];
  var LS_DATE = 'May 08 2026';

  // ─── Shell palette ──────────────────────────────────────

  var trigger = document.getElementById('open-shell');
  if (trigger) {
    initShell(trigger);
  }

  function initShell(trigger) {
    var scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.innerHTML =
      '<div class="palette" role="dialog" aria-modal="true" aria-label="RAZKOM shell">' +
      '<label class="palette-in"><span class="ps1">user@razkom:' + cwdLabel() + '$</span>' +
      '<input type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" maxlength="200" aria-label="Command" enterkeyhint="go" /></label>' +
      '<div class="palette-out" aria-live="polite"></div>' +
      '<div class="palette-foot"><span><kbd>esc</kbd> close</span><span><kbd>tab</kbd> complete</span><span><kbd>&uarr;</kbd> history</span></div>' +
      '</div>';
    document.body.appendChild(scrim);

    var input = scrim.querySelector('input');
    var out = scrim.querySelector('.palette-out');
    var history = [];
    var historyPos = 0;
    var greeted = false;

    function open() {
      if (!greeted) {
        print('RAZKOM shell. Type help to see what you can do.');
        greeted = true;
      }
      scrim.classList.add('open');
      input.focus();
    }

    function close() {
      scrim.classList.remove('open');
      trigger.focus();
    }

    trigger.addEventListener('click', open);
    scrim.addEventListener('mousedown', function (e) {
      if (e.target === scrim) close();
    });

    document.addEventListener('keydown', function (e) {
      var open_ = scrim.classList.contains('open');
      if (e.key === 'Escape' && open_) {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === '`' && !open_ && !isTyping(e.target)) {
        e.preventDefault();
        open();
      }
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var line = input.value;
        input.value = '';
        if (line.trim()) {
          history.push(line);
        }
        historyPos = history.length;
        run(line);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        complete();
      } else if (e.key === 'ArrowUp') {
        if (historyPos > 0) {
          e.preventDefault();
          historyPos -= 1;
          input.value = history[historyPos];
        }
      } else if (e.key === 'ArrowDown') {
        if (historyPos < history.length) {
          e.preventDefault();
          historyPos += 1;
          input.value = history[historyPos] || '';
        }
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        out.textContent = '';
      }
    });

    function print(text, cls) {
      var el = document.createElement('div');
      if (cls) el.className = cls;
      el.textContent = text;
      out.appendChild(el);
      out.scrollTop = out.scrollHeight;
      return el;
    }

    function run(raw) {
      var line = raw.trim();
      print(line, 'cmd-echo');
      if (!line) return;

      var parts = line.split(/\s+/);
      var cmd = parts[0].toLowerCase();
      var args = parts.slice(1);

      switch (cmd) {
        case 'help':
        case '?':
        case '-h':
        case '--help':
          return print([
            'cat FILE        print a file',
            'cd APP          open an app page (cd ~ for home)',
            'clear           clear the screen',
            'exit            close the shell',
            'ls [-al]        list the home directory',
            'pwd             print working directory',
            'whoami          who runs this place',
          ].join('\n'));
        case 'clear':
          out.textContent = '';
          return;
        case 'exit':
          close();
          return;
        case 'pwd':
          return print('/home/user' + (cwd() ? '/' + cwd() : ''));
        case 'whoami':
          return print('RAZKOM // a one-person software studio\nest. 2026 // windows tools');
        case 'ls':
          return ls(args);
        case 'cat':
          return cat(args);
        case 'cd':
          return cd(args);
        case 'sudo':
          return print('user is not in the sudoers file. This incident will be reported.', 'err');
        default:
          return print('bash: ' + cmd + ': command not found', 'err');
      }
    }

    function ls(args) {
      var all = false;
      var long = false;
      var path = '';
      args.forEach(function (a) {
        if (a.charAt(0) === '-') {
          all = all || a.indexOf('a') !== -1;
          long = long || a.indexOf('l') !== -1;
        } else {
          path = a.replace(/\/+$/, '');
        }
      });
      if (path && path !== '.' && path !== '~') {
        return print("ls: cannot access '" + path + "': No such file or directory", 'err');
      }
      var entries = [];
      if (all) entries.push(['d', '.'], ['d', '..'], ['-', '.hushlogin', 0]);
      APP_NAMES.forEach(function (n) { entries.push(['d', n + '/']); });
      entries.push(['-', 'manifesto.txt', FILES['manifesto.txt'].length]);
      if (all) entries.push(['p', 'secrets.txt', FILES['secrets.txt'].length]);

      if (!long) {
        return print(entries.map(function (e) { return e[1]; }).join('  '));
      }
      print(['total ' + entries.length * 4].concat(entries.map(function (e) {
        var mode = e[0] === 'd' ? 'drwxr-xr-x' : e[0] === 'p' ? '-rw-------' : '-rw-r--r--';
        var size = e[0] === 'd' ? 4096 : e[2];
        return mode + '  1 user razkom ' + padStart(String(size), 5) + ' ' + LS_DATE + ' ' + e[1];
      })).join('\n'));
    }

    function cat(args) {
      if (!args.length) return print('cat: missing operand', 'err');
      args.forEach(function (name) {
        var key = name.replace(/^(\.\/|~\/)/, '');
        if (FILES.hasOwnProperty(key)) {
          print(FILES[key]);
        } else if (APPS.hasOwnProperty(key.replace(/\/$/, ''))) {
          print('cat: ' + name + ': Is a directory', 'err');
        } else {
          print('cat: ' + name + ': No such file or directory', 'err');
        }
      });
    }

    function cd(args) {
      if (args.length > 1) return print('cd: too many arguments', 'err');
      var target = (args[0] || '~').toLowerCase().replace(/^(\.\/|~\/|\/)+/, '').replace(/\/+$/, '');
      if (!target || target === '~' || target === '..' || target === '.') {
        if (location.pathname === '/') {
          close();
          window.scrollTo(0, 0);
        } else {
          location.assign('/');
        }
        return;
      }
      var href = APPS[target];
      if (!href) return print('cd: ' + target + ': No such file or directory', 'err');
      print(href.indexOf('http') === 0 ? 'opening authforge.cc ...' : 'opening ' + href + ' ...');
      location.assign(href);
    }

    function complete() {
      var value = input.value;
      var m = value.match(/^(\s*)(\S*)(\s+)?(\S*)$/);
      if (!m) return;
      if (!m[3]) {
        var cmds = startsWith(COMMANDS, m[2].toLowerCase());
        if (cmds.length === 1) input.value = m[1] + cmds[0] + ' ';
        else if (cmds.length > 1 && m[2]) print(cmds.join('  '));
        return;
      }
      var cmd = m[2].toLowerCase();
      var pool = cmd === 'cd' ? APP_NAMES : cmd === 'cat' ? Object.keys(FILES) : null;
      if (!pool) return;
      var hits = startsWith(pool, m[4].toLowerCase());
      if (hits.length === 1) input.value = m[1] + m[2] + m[3] + hits[0];
      else if (hits.length > 1) print(hits.join('  '));
    }
  }

  function cwd() {
    var seg = location.pathname.split('/').filter(Boolean)[0] || '';
    return APPS.hasOwnProperty(seg) ? seg : '';
  }

  function cwdLabel() {
    return '~' + (cwd() ? '/' + cwd() : '');
  }

  function isTyping(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  function startsWith(list, prefix) {
    return list.filter(function (s) { return s.indexOf(prefix) === 0; });
  }

  function padStart(s, n) {
    while (s.length < n) s = ' ' + s;
    return s;
  }

  // ─── Copy buttons (install commands) ────────────────────

  [].forEach.call(document.querySelectorAll('.copy[data-copy]'), function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      if (!navigator.clipboard || !text) return;
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = 'copied';
        btn.classList.add('done');
        setTimeout(function () {
          btn.textContent = 'copy';
          btn.classList.remove('done');
        }, 1500);
      }, function () {});
    });
  });

  // ─── AuthForge "Activate your license" demo ─────────────

  var lic = document.querySelector('[data-license-demo]');
  if (lic) {
    initLicenseDemo(lic);
  }

  function initLicenseDemo(root) {
    var input = root.querySelector('.lic-input');
    var status = root.querySelector('.lic-status');
    var badge = root.querySelector('.lic-badge');
    var msg = root.querySelector('.lic-status p');
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    function segment() {
      var s = '';
      for (var i = 0; i < 4; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
      return s;
    }

    input.value = [segment(), segment(), segment(), segment()].join('-');

    function show(kind, label, text) {
      status.hidden = false;
      status.className = 'lic-status is-' + kind;
      badge.textContent = label;
      msg.textContent = text;
    }

    root.querySelector('.lic-go').addEventListener('click', function () {
      var key = input.value.trim().toUpperCase();
      input.value = key;
      if (/^([A-Z0-9]{4}-){3}[A-Z0-9]{4}$/.test(key)) {
        show('valid', 'VALID', 'Signed response verified. Bound to this device, slot 1 of 3.');
      } else {
        show('invalid', 'INVALID', 'Key format looks wrong. Try XXXX-XXXX-XXXX-XXXX.');
      }
    });

    root.querySelector('.lic-buy').addEventListener('click', function () {
      show('checkout', 'CHECKOUT', 'Sends your users to your own Stripe checkout.');
    });

    input.addEventListener('input', function () {
      status.hidden = true;
    });
  }
})();
