/* ==========================================================================
   Home of 17. —— 应用层：路由、导航树、本页目录、搜索、主题
   ========================================================================== */
(function () {
  'use strict';

  var R = window.R;
  var Store = window.Store;
  var esc = R.esc;

  var main = document.getElementById('main');
  var navTree = document.getElementById('navTree');
  var sidebar = document.getElementById('sidebar');
  var tocSidebar = document.getElementById('tocSidebar');
  var scrim = document.getElementById('scrim');
  var searchWrap = document.getElementById('searchWrap');
  var searchInput = document.getElementById('searchInput');
  var searchOutput = document.getElementById('searchOutput');
  var searchResults = document.getElementById('searchResults');
  var backTop = document.getElementById('backTop');
  var themeBtn = document.getElementById('themeBtn');

  /* ---------------- 主题（黑白双色，互为反转） ---------------- */
  var THEME_KEY = 'homeof17.theme';
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    if (themeBtn) {
      themeBtn.textContent = t === 'dark' ? 'LIGHT' : 'DARK';
      themeBtn.setAttribute('aria-label', t === 'dark' ? '切换到浅色' : '切换到深色');
    }
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { }
  }
  (function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { }
    if (!saved) saved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    applyTheme(saved);
  })();
  if (themeBtn) themeBtn.onclick = function () {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  };

  /* ---------------- 左侧导航树 ---------------- */
  function sectionHtml(key, label, children) {
    return '<li class="md-nav__item md-nav__item--section" data-sec="' + esc(key) + '">' +
      '<button class="md-nav__toggle" type="button" aria-expanded="false">' +
      '<span>' + esc(label) + '</span><span class="chev" aria-hidden="true">+</span></button>' +
      '<ul class="md-nav__list md-nav__list--nested">' + children + '</ul></li>';
  }
  function linkHtml(href, key, label) {
    return '<li class="md-nav__item"><a class="md-nav__link" href="' + href + '" data-key="' + esc(key) + '">' + esc(label) + '</a></li>';
  }

  function buildNav() {
    var html = '<ul class="md-nav__list">';
    html += linkHtml('#/home', 'home', '首页');
    html += linkHtml('#/preface', 'preface', '卷首 · 作者想说的话');

    (window.MODULES || []).forEach(function (m) {
      var kids = linkHtml('#' + '/' + m.id, m.id, '本章总览');
      var flat = m.groups.length === 1;
      m.groups.forEach(function (g) {
        var items = g.articles.map(function (a) {
          return linkHtml('#/' + m.id + '/' + a.id, m.id + '/' + a.id, a.title);
        }).join('');
        if (flat) { kids += items; return; }
        kids += '<li class="md-nav__item md-nav__item--subsection" data-sub="' + m.id + '/' + g.id + '">' +
          '<button class="md-nav__toggle" type="button" aria-expanded="false">' +
          '<span>' + esc(g.title) + '</span><span class="chev" aria-hidden="true">+</span></button>' +
          '<ul class="md-nav__list md-nav__list--nested">' + items + '</ul></li>';
      });
      html += sectionHtml(m.id, R.moduleLabel(m), kids);
    });

    html += sectionHtml('tools', '方法与工具', (window.TOOLS || []).map(function (t) {
      return linkHtml('#/tools/' + t.id, 'tools/' + t.id, t.title);
    }).join(''));

    html += linkHtml('#/resources', 'resources', '资源库');

    html += sectionHtml('about', '关于本站',
      linkHtml('#/about', 'about', '关于本站') + linkHtml('#/help', 'help', '需要帮助时'));
    html += linkHtml('#/letters', 'letters', '读者想说');
    html += '</ul>';
    navTree.innerHTML = html;

    navTree.addEventListener('click', function (e) {
      var btn = e.target.closest('.md-nav__toggle');
      if (!btn) return;
      var li = btn.parentNode;
      var open = li.classList.toggle('md-nav__item--open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.querySelector('.chev').textContent = open ? '−' : '+';
    });
  }

  function setNavActive(key) {
    var links = navTree.querySelectorAll('.md-nav__link');
    var active = null;
    Array.prototype.forEach.call(links, function (a) {
      var on = a.dataset.key === key;
      a.classList.toggle('md-nav__link--active', on);
      if (on) active = a;
    });
    if (!active) return;
    ['md-nav__item--subsection', 'md-nav__item--section'].forEach(function (cls) {
      var box = active.closest('.' + cls);
      if (!box) return;
      box.classList.add('md-nav__item--open');
      var b = box.querySelector('.md-nav__toggle');
      if (b) {
        b.setAttribute('aria-expanded', 'true');
        b.querySelector('.chev').textContent = '−';
      }
    });
    var scrollBox = sidebar.querySelector('.md-sidebar__scroll');
    if (scrollBox && active.offsetTop !== undefined) {
      var top = active.offsetTop, h = active.offsetHeight;
      if (top < scrollBox.scrollTop || top + h > scrollBox.scrollTop + scrollBox.clientHeight) {
        scrollBox.scrollTop = Math.max(0, top - scrollBox.clientHeight / 2);
      }
    }
  }

  /* 移动端抽屉 */
  function toggleDrawer(open) {
    var on = open === undefined ? !sidebar.classList.contains('md-sidebar--open') : open;
    sidebar.classList.toggle('md-sidebar--open', on);
    scrim.hidden = !on;
    document.getElementById('menuBtn').setAttribute('aria-expanded', on ? 'true' : 'false');
    document.body.style.overflow = on ? 'hidden' : '';
  }
  document.getElementById('menuBtn').onclick = function () { toggleDrawer(); };
  scrim.onclick = function () { toggleDrawer(false); };
  sidebar.addEventListener('click', function (e) {
    if (e.target.closest('a') && window.innerWidth <= 960) toggleDrawer(false);
  });

  /* ---------------- 路由 ---------------- */
  function parseHash() {
    var h = location.hash || '#/home';
    if (h.charAt(0) === '#') h = h.slice(1);
    if (h.charAt(0) !== '/') h = '/' + h;
    return h.split('/').filter(Boolean);
  }

  function breadcrumbFor(p) {
    var root = p[0] || 'home';
    var out = [{ t: '首页', h: root === 'home' ? null : '#/home' }];
    var mod = R.getModule(root);
    if (mod) {
      out.push({ t: R.moduleLabel(mod), h: p[1] ? '#/' + mod.id : null });
      if (p[1]) {
        var f = R.getArticle(mod, p[1]);
        if (f) out.push({ t: f.article.title });
      }
      return out;
    }
    if (root === 'preface') out.push({ t: '卷首 · 作者想说的话' });
    else if (root === 'tools') {
      out.push({ t: '方法与工具', h: p[1] ? '#/tools' : null });
      if (p[1]) {
        var t = (window.TOOLS || []).filter(function (x) { return x.id === p[1]; })[0];
        if (t) out.push({ t: t.title });
      }
    } else if (root === 'resources') out.push({ t: '资源库' });
    else if (root === 'about') out.push({ t: '关于本站' });
    else if (root === 'help') { out.push({ t: '关于本站', h: '#/about' }); out.push({ t: '需要帮助时' }); }
    else if (root === 'letters') out.push({ t: '读者想说' });
    return out;
  }

  function breadcrumbHtml(items) {
    return items.map(function (it, i) {
      var inner = it.h ? '<a href="' + it.h + '">' + esc(it.t) + '</a>' : esc(it.t);
      return (i ? '<span class="sep">/</span>' : '') + inner;
    }).join('');
  }

  function pageTitle(t) {
    document.title = (t ? t + ' — ' : '') + window.SITE.name;
  }

  var currentToolId = null;

  function route() {
    var p = parseHash();
    var root = p[0] || 'home';
    var sub = p[1] || '';
    var html = '', navKey = root, title = '';

    if (root === 'home') {
      html = R.homeHtml(); navKey = 'home';
    } else if (root === 'preface') {
      html = R.prefaceHtml(); title = '作者想说的话'; navKey = 'preface';
    } else if (['why', 'process', 'slow', 'long', 'practice'].indexOf(root) >= 0) {
      var mod = R.getModule(root);
      if (!mod) { html = R.notFound(); }
      else if (!sub) { html = R.moduleHtml(mod); title = R.moduleLabel(mod); navKey = mod.id; }
      else {
        var found = R.getArticle(mod, sub);
        if (!found) { html = R.notFound('没有找到这一篇'); }
        else { html = R.articleHtml(mod, found.group, found.article); title = found.article.title; navKey = mod.id + '/' + sub; }
      }
    } else if (root === 'tools') {
      currentToolId = sub || null;
      html = sub ? R.toolPageHtml(sub) : R.toolsIndexHtml();
      title = sub ? ((window.TOOLS || []).filter(function (x) { return x.id === sub; })[0] || {}).title : '方法与工具';
      navKey = sub ? 'tools/' + sub : 'tools';
    } else if (root === 'resources') {
      html = R.resourcesHtml(); title = '资源库'; navKey = 'resources';
    } else if (root === 'about') {
      html = R.aboutHtml(); title = '关于本站'; navKey = 'about';
    } else if (root === 'help') {
      html = R.helpHtml(); title = '需要帮助时'; navKey = 'help';
    } else if (root === 'letters') {
      html = R.lettersPageHtml(); title = '读者想说'; navKey = 'letters';
    } else {
      html = R.notFound(); navKey = '';
    }

    main.innerHTML = html;
    var content = main.querySelector('.md-content');

    /* 面包屑 */
    var crumb = main.querySelector('[data-crumb]');
    if (crumb) {
      var items = breadcrumbFor(p);
      if (items.length <= 1) crumb.remove();
      else crumb.innerHTML = breadcrumbHtml(items);
    }

    /* 上一页 / 下一页 */
    var pn = main.querySelector('[data-prevnext]');
    if (pn) {
      var pages = R.flatPages();
      var href = '#/' + (root === 'home' ? 'home' : p.join('/'));
      var idx = -1;
      for (var i = 0; i < pages.length; i++) { if (pages[i].href === href) { idx = i; break; } }
      var out = '';
      if (idx > 0) {
        out += '<a class="prev" href="' + pages[idx - 1].href + '"><span class="dir">← 上一页</span>' +
          '<span class="ttl">' + esc(pages[idx - 1].title) + '</span></a>';
      } else { out += '<span class="spacer"></span>'; }
      if (idx >= 0 && idx < pages.length - 1) {
        out += '<a class="next" href="' + pages[idx + 1].href + '"><span class="dir">下一页 →</span>' +
          '<span class="ttl">' + esc(pages[idx + 1].title) + '</span></a>';
      }
      pn.innerHTML = out;
      if (!out) pn.remove();
    }

    setNavActive(navKey);
    pageTitle(title);
    buildToc(content);
    window.scrollTo({ top: 0, behavior: 'auto' });
    closeSearch();

    if (root === 'tools') {
      if (currentToolId && window.TOOLS_INIT && window.TOOLS_INIT[currentToolId]) {
        try { window.TOOLS_INIT[currentToolId](main); } catch (e) { console.error(e); }
      } else {
        try { window.initDataManager(main); } catch (e) { console.error(e); }
      }
    }
    initChecklists(main);
    initLetters(main);
    updateBackTop();
  }

  window.addEventListener('hashchange', route);

  /* ---------------- 右侧本页目录 ---------------- */
  var spy = null;
  function buildToc(content) {
    if (spy) { spy.disconnect(); spy = null; }
    if (!content) { tocSidebar.innerHTML = ''; return; }
    var items = [];
    Array.prototype.forEach.call(content.querySelectorAll('h2[id]'), function (h) {
      items.push({ id: h.id, text: h.textContent.replace(/¶/g, '').trim() });
    });
    Array.prototype.forEach.call(content.querySelectorAll('.res-cat[id]'), function (s) {
      var h = s.querySelector('h2');
      if (h) items.push({ id: s.id, text: h.textContent.replace(/¶/g, '').trim() });
    });
    if (items.length < 2) { tocSidebar.innerHTML = ''; return; }

    tocSidebar.innerHTML = '<nav class="md-nav"><p class="md-toc__title">本页目录</p>' +
      '<ul class="md-toc__list">' + items.map(function (it) {
        return '<li><a href="#' + it.id + '" data-toc="' + it.id + '">' + esc(it.text) + '</a></li>';
      }).join('') + '</ul>' +
      '<a class="md-toc__back" href="#/home" data-backtop>回到顶部 ↑</a></nav>';

    var links = tocSidebar.querySelectorAll('a[data-toc]');
    var map = {};
    Array.prototype.forEach.call(links, function (l) { map[l.dataset.toc] = l; });
    if (!window.IntersectionObserver) return;
    spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        Array.prototype.forEach.call(links, function (l) { l.classList.remove('on'); });
        var el = map[en.target.id];
        if (el) el.classList.add('on');
      });
    }, { rootMargin: '-70px 0px -72% 0px', threshold: 0 });
    items.forEach(function (it) {
      var el = document.getElementById(it.id);
      if (el) spy.observe(el);
    });
  }

  /* ---------------- 页内锚点与标题链接 ---------------- */
  document.addEventListener('click', function (e) {
    var back = e.target.closest('[data-backtop]');
    if (back) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.length < 2 || href.indexOf('#/') === 0) return;
    var el = document.getElementById(href.slice(1));
    if (!el) return;
    e.preventDefault();
    if (window.innerWidth <= 960) toggleDrawer(false);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (a.dataset.toc) {
      Array.prototype.forEach.call(document.querySelectorAll('.md-toc__list a'), function (x) { x.classList.remove('on'); });
      a.classList.add('on');
    }
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.headerlink');
    if (!btn) return;
    var id = btn.dataset.anchor;
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.copyText(location.href.split('#')[0] + location.hash);
    window.toast('已复制本页链接');
  });

  /* 打印当前页面正文 */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-print]');
    if (!b) return;
    var art = document.querySelector('.md-content');
    if (!art) return;
    var clone = art.cloneNode(true);
    ['.md-actions', '[data-prevnext]', '.signoff', '.md-breadcrumbs'].forEach(function (sel) {
      var n = clone.querySelector(sel); if (n) n.remove();
    });
    window.printHtml('<h1>' + esc(b.dataset.print) + '</h1>' + clone.innerHTML);
  });

  /* ---------------- 读者想说 ---------------- */
  var LT_KEY = 'letters.mine';
  var LT_DRAFT = 'letters.draft';

  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = cb;
    s.onerror = function () { window.toast('留言组件加载失败'); };
    document.body.appendChild(s);
  }

  function commentsEmbed(box) {
    var c = window.COMMENTS || {};
    var el = box.querySelector('[data-comments]');
    if (!el || !c.provider) return;
    var cfg = c[c.provider] || {};
    var ready = (c.provider === 'twikoo' && cfg.envId) ||
                (c.provider === 'giscus' && cfg.repo) ||
                (c.provider === 'waline' && cfg.serverURL);
    if (!ready) return;
    el.hidden = false;
    el.innerHTML = '<h3>大家的留言</h3><div data-comment-host></div>';
    var host = el.querySelector('[data-comment-host]');

    if (c.provider === 'twikoo') {
      loadScript(cfg.cdn || 'https://cdn.jsdelivr.net/npm/twikoo@1.6.44/dist/twikoo.min.js', function () {
        if (!window.twikoo) return;
        window.twikoo.init({ envId: cfg.envId, el: host, path: location.hash || '/' });
      });
    } else if (c.provider === 'waline') {
      loadScript('https://unpkg.com/@waline/client@v3/dist/waline.js', function () {
        if (!window.initWaline) return;
        window.initWaline({ el: host, serverURL: cfg.serverURL, path: location.hash || '/', dark: 'html[data-theme="dark"]' });
      });
    } else if (c.provider === 'giscus') {
      var s = document.createElement('script');
      s.src = 'https://giscus.app/client.js';
      s.async = true; s.crossOrigin = 'anonymous';
      var attrs = {
        'data-repo': cfg.repo, 'data-repo-id': cfg.repoId,
        'data-category': cfg.category, 'data-category-id': cfg.categoryId,
        'data-mapping': cfg.mapping || 'pathname',
        'data-theme': document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
        'data-lang': cfg.lang || 'zh-CN', 'data-reactions-enabled': '1'
      };
      Object.keys(attrs).forEach(function (k) { s.setAttribute(k, attrs[k]); });
      host.appendChild(s);
    }
  }

  function initLetters(scope) {
    var box = scope.querySelector('[data-letters]');
    if (!box) return;
    var nameEl = box.querySelector('#ltName');
    var textEl = box.querySelector('#ltText');
    var mine = box.querySelector('[data-lt-mine]');
    var listEl = box.querySelector('[data-lt-list]');
    var countEl = box.querySelector('[data-lt-count]');

    function mineAll() { return Store.load(LT_KEY, []); }
    function today() {
      var d = new Date();
      return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }
    function fullText() {
      var n = (nameEl.value || '').trim();
      var t = (textEl.value || '').trim();
      return '【署名】' + (n || '匿名') + '\n\n' + t + '\n\n—— 来自 Home of 17.（' + today() + '）';
    }

    function renderMine() {
      var all = mineAll();
      countEl.textContent = all.length;
      mine.hidden = all.length === 0;
      listEl.innerHTML = all.slice().reverse().map(function (item, i) {
        var idx = all.length - 1 - i;
        return '<article class="letter letter--mine">' +
          '<header class="letter__meta">' +
          '<span class="letter__name">' + esc(item.name || '匿名') + '</span>' +
          '<time class="letter__date">' + esc(item.date) + '</time>' +
          '<button class="btn btn-sm btn-danger" type="button" data-lt-del="' + idx + '">删除</button>' +
          '</header>' +
          '<p class="letter__text">' + esc(item.text) + '</p></article>';
      }).join('');
      Array.prototype.forEach.call(listEl.querySelectorAll('[data-lt-del]'), function (b) {
        b.onclick = function () {
          var a = mineAll();
          a.splice(+b.dataset.ltDel, 1);
          Store.save(LT_KEY, a);
          renderMine();
          window.toast('已删除');
        };
      });
    }

    /* 草稿自动保存：换页或误关也不丢 */
    var d = Store.load(LT_DRAFT, null);
    if (d) { nameEl.value = d.name || ''; textEl.value = d.text || ''; }
    function saveDraft() { Store.save(LT_DRAFT, { name: nameEl.value, text: textEl.value }); }
    nameEl.addEventListener('input', saveDraft);
    textEl.addEventListener('input', saveDraft);

    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lt]');
      if (!b) return;
      var act = b.dataset.lt;
      var t = (textEl.value || '').trim();

      if (act === 'save') {
        if (!t) { window.toast('先写点什么吧'); textEl.focus(); return; }
        var all = mineAll();
        all.push({ name: (nameEl.value || '').trim() || '匿名', date: today(), text: t });
        Store.save(LT_KEY, all);
        renderMine();
        window.toast('已保存，出现在下面「我写过的」里');
        mine.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      if (act === 'mail') {
        if (!t) { window.toast('先写点什么吧'); textEl.focus(); return; }
        var url = 'mailto:' + window.SITE.email +
          '?subject=' + encodeURIComponent('读者想说｜Home of 17.') +
          '&body=' + encodeURIComponent(fullText());
        if (url.length > 1800) { window.toast('内容较长，建议用「复制内容」再粘贴到邮件里'); }
        location.href = url;
        window.toast('正在打开你的邮件应用……没有反应就点「复制内容」');
        return;
      }

      if (act === 'copy') {
        if (!t) { window.toast('先写点什么吧'); textEl.focus(); return; }
        window.copyText(fullText());
        return;
      }

      if (act === 'clear') {
        nameEl.value = ''; textEl.value = '';
        Store.del(LT_DRAFT);
        window.toast('已清空（下面已保存的内容还在）');
        textEl.focus();
      }
    });

    renderMine();
    commentsEmbed(box);
  }

  /* ---------------- 清单持久化 ---------------- */
  function initChecklists(scope) {
    scope.querySelectorAll('.checklist[data-check]').forEach(function (box) {
      var rid = box.dataset.check;
      var all = Store.load('checks', {});
      var state = all[rid] || [];
      var inputs = box.querySelectorAll('input[type="checkbox"]');
      Array.prototype.forEach.call(inputs, function (cb, i) { cb.checked = !!state[i]; });
      function save() {
        var a = Store.load('checks', {});
        a[rid] = Array.prototype.map.call(inputs, function (x) { return x.checked; });
        Store.save('checks', a);
      }
      Array.prototype.forEach.call(inputs, function (cb) { cb.onchange = save; });
      var rb = box.querySelector('[data-check-reset]');
      if (rb) rb.onclick = function () {
        Array.prototype.forEach.call(inputs, function (cb) { cb.checked = false; });
        var a = Store.load('checks', {}); delete a[rid]; Store.save('checks', a);
        window.toast('已重置这张清单');
      };
    });
  }

  /* ---------------- 回到顶部 ---------------- */
  function updateBackTop() { backTop.hidden = window.scrollY < 400; }
  window.addEventListener('scroll', updateBackTop, { passive: true });
  backTop.onclick = function () { window.scrollTo({ top: 0, behavior: 'smooth' }); };

  /* ---------------- 搜索 ---------------- */
  var hits = [], cursor = 0;

  function openSearch() {
    searchOutput.hidden = false;
    searchInput.setAttribute('aria-expanded', 'true');
    if (window.innerWidth <= 720) searchWrap.classList.add('md-search--active');
  }
  function closeSearch() {
    searchOutput.hidden = true;
    searchInput.setAttribute('aria-expanded', 'false');
    searchWrap.classList.remove('md-search--active');
  }
  function hl(text, q) {
    var t = esc(text);
    String(q).trim().split(/\s+/).filter(Boolean).forEach(function (p) {
      var re = new RegExp('(' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      t = t.replace(re, '<mark>$1</mark>');
    });
    return t;
  }
  function renderSearch(q) {
    hits = []; cursor = 0;
    if (!q.trim()) {
      searchResults.innerHTML = '<p class="md-search__hint">输入关键词搜索全站：试试「过程」「功利」「长远」「睡眠」「书单」。</p>';
      return;
    }
    hits = R.search(q);
    if (!hits.length) {
      searchResults.innerHTML = '<p class="md-search__hint">没有找到「' + esc(q) + '」。换个更短的关键词试试。</p>';
      return;
    }
    var html = '', lastType = '';
    hits.forEach(function (h, i) {
      if (h.type !== lastType) { html += '<div class="md-search__group">' + esc(h.type) + '</div>'; lastType = h.type; }
      var ext = /^https?:/i.test(h.href);
      html += '<a class="md-search__hit' + (i === 0 ? ' on' : '') + '" href="' + esc(h.href) + '" data-i="' + i + '"' +
        (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
        '<div class="h-title">' + hl(h.title, q) + '</div>' +
        '<div class="h-path">' + h.path.map(esc).join(' / ') + '</div>' +
        '<div class="h-snip">' + hl(h.snippet, q) + '</div></a>';
    });
    searchResults.innerHTML = html;
    Array.prototype.forEach.call(searchResults.querySelectorAll('.md-search__hit'), function (a) {
      a.addEventListener('click', function () { setTimeout(closeSearch, 20); });
    });
  }
  function moveCursor(d) {
    var nodes = searchResults.querySelectorAll('.md-search__hit');
    if (!nodes.length) return;
    cursor = (cursor + d + nodes.length) % nodes.length;
    Array.prototype.forEach.call(nodes, function (n, i) { n.classList.toggle('on', i === cursor); });
    nodes[cursor].scrollIntoView({ block: 'nearest' });
  }

  searchInput.addEventListener('focus', function () { openSearch(); renderSearch(searchInput.value); });
  searchInput.addEventListener('input', function () { openSearch(); renderSearch(searchInput.value); });
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveCursor(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveCursor(-1); }
    else if (e.key === 'Enter') {
      var node = searchResults.querySelectorAll('.md-search__hit')[cursor];
      if (node) node.click();
      if (/^https?:/i.test(node ? node.getAttribute('href') : '')) closeSearch();
    } else if (e.key === 'Escape') { closeSearch(); searchInput.blur(); }
  });
  document.addEventListener('click', function (e) {
    if (!searchWrap.contains(e.target)) closeSearch();
  });
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select';
    if (e.key === '/' && !typing) { e.preventDefault(); searchInput.focus(); searchInput.select(); }
    if (e.key === 'Escape') {
      closeSearch();
      if (window.innerWidth <= 960) toggleDrawer(false);
    }
    if (e.key === 'k' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); searchInput.focus(); searchInput.select(); }
  });

  /* ---------------- 启动 ---------------- */
  buildNav();
  if (!location.hash) location.hash = '#/home';
  route();
})();
