/* ==========================================================================
   Home of 17. —— 渲染层
   ========================================================================== */
(function () {
  'use strict';

  var R = {};

  /* ---------------- 工具函数 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* 行内标记：**粗体**、`代码`、[文字](链接) */
  function inline(s) {
    var t = esc(s);
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, txt, url) {
      var safe = /^(https?:|#|\/|mailto:|tel:)/i.test(url) ? url : '#';
      var ext = /^https?:/i.test(safe) ? ' target="_blank" rel="noopener noreferrer"' : '';
      return '<a href="' + safe + '"' + ext + '>' + txt + '</a>';
    });
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    return t;
  }

  function listHtml(tag, arr) {
    return '<' + tag + '>' + arr.map(function (i) { return '<li>' + inline(i) + '</li>'; }).join('') + '</' + tag + '>';
  }

  function hash(str) {
    var h = 0, i;
    for (var k = 0; k < str.length; k++) { h = (h * 31 + str.charCodeAt(k)) | 0; }
    return h;
  }

  /* ---------------- 内容积木渲染 ---------------- */
  function blockHtml(b, uid) {
    if (!b) return '';
    switch (b.t) {
      case 'p':
        return '<p>' + inline(b.x) + '</p>';
      case 'h':
        return '<h2 id="' + uid + '">' + inline(b.x) +
          '<button class="headerlink" type="button" data-anchor="' + uid + '" title="复制本小节链接" aria-label="小节链接">¶</button></h2>';
      case 'ul':
        return listHtml('ul', b.x);
      case 'ol':
        return listHtml('ol', b.x);
      case 'quote':
        return '<blockquote class="quote">' + inline(b.x) +
          (b.by ? '<cite>—— ' + esc(b.by) + '</cite>' : '') + '</blockquote>';
      case 'callout':
        var idea = b.tone === 'idea';
        return '<div class="admonition' + (idea ? ' admonition--idea' : '') + '">' +
          (b.title ? '<p class="admonition-title">' + inline(b.title) + '</p>' : '') +
          (b.x || []).map(function (p) { return '<p>' + inline(p) + '</p>'; }).join('') +
          '</div>';
      case 'table':
        return '<div class="table-wrap"><table><thead><tr>' +
          b.head.map(function (h) { return '<th>' + inline(h) + '</th>'; }).join('') +
          '</tr></thead><tbody>' +
          b.rows.map(function (r) {
            return '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>';
          }).join('') +
          '</tbody></table></div>';
      case 'steps':
        return '<div class="steps">' + b.x.map(function (s) {
          return '<div class="step"><b>' + inline(s.title) + '</b>' + (s.x ? '<p>' + inline(s.x) + '</p>' : '') + '</div>';
        }).join('') + '</div>';
      case 'kv':
        return '<dl class="kv-grid">' + b.x.map(function (p) {
          return '<div class="kv"><dt>' + inline(p[0]) + '</dt><dd>' + inline(p[1]) + '</dd></div>';
        }).join('') + '</dl>';
      case 'check':
        var rid = 'ck-' + uid + '-' + Math.abs(hash(b.title + (b.x || []).join('')));
        return '<div class="checklist" data-check="' + rid + '">' +
          '<div class="checklist-head"><b>' + inline(b.title) + '</b>' +
          '<button class="btn btn-sm btn-ghost" type="button" data-check-reset="' + rid + '">重置</button></div>' +
          b.x.map(function (item, i) {
            var id = rid + '-' + i;
            return '<label for="' + id + '"><input type="checkbox" id="' + id + '"><span>' + inline(item) + '</span></label>';
          }).join('') + '</div>';
      default:
        return '';
    }
  }

  function bodyHtml(article) {
    var uid = article._uid;
    return article.body.map(function (b, i) {
      return blockHtml(b, b.t === 'h' ? uid + '-s' + i : uid + '-b' + i);
    }).join('');
  }

  /* ---------------- 查询 ---------------- */
  function getModule(id) {
    var list = window.MODULES || [];
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) return list[i]; }
    return null;
  }
  function getArticle(mod, articleId) {
    if (!mod) return null;
    for (var g = 0; g < mod.groups.length; g++) {
      var grp = mod.groups[g];
      for (var a = 0; a < grp.articles.length; a++) {
        if (grp.articles[a].id === articleId) return { group: grp, article: grp.articles[a] };
      }
    }
    return null;
  }
  function allArticles() {
    var out = [];
    (window.MODULES || []).forEach(function (m) {
      m.groups.forEach(function (g) {
        g.articles.forEach(function (a) { out.push({ module: m, group: g, article: a }); });
      });
    });
    return out;
  }
  function moduleLabel(m) {
    return m.numeral ? m.numeral + ' · ' + m.title : m.title;
  }

  /* 展平页面顺序：用于「上一页 / 下一页」与面包屑 */
  function flatPages() {
    var out = [{ title: '首页', href: '#/home', crumb: ['首页'] }];
    out.push({ title: '作者想说的话', href: '#/preface', crumb: ['首页', '卷首 · 作者想说的话'] });
    (window.MODULES || []).forEach(function (m) {
      out.push({ title: moduleLabel(m), href: '#/' + m.id, crumb: ['首页', moduleLabel(m)] });
      m.groups.forEach(function (g) {
        g.articles.forEach(function (a) {
          out.push({ title: a.title, href: '#/' + m.id + '/' + a.id, crumb: ['首页', moduleLabel(m), a.title] });
        });
      });
    });
    out.push({ title: '方法与工具', href: '#/tools', crumb: ['首页', '方法与工具'] });
    (window.TOOLS || []).forEach(function (t) {
      out.push({ title: t.title, href: '#/tools/' + t.id, crumb: ['首页', '方法与工具', t.title] });
    });
    out.push({ title: '资源库', href: '#/resources', crumb: ['首页', '资源库'] });
    out.push({ title: '关于本站', href: '#/about', crumb: ['首页', '关于本站'] });
    out.push({ title: '需要帮助时', href: '#/help', crumb: ['首页', '关于本站', '需要帮助时'] });
    out.push({ title: '读者想说', href: '#/letters', crumb: ['首页', '读者想说'] });
    return out;
  }

  function cardsHtml(items, cls) {
    return '<div class="md-cards' + (cls ? ' ' + cls : '') + '">' + items.map(function (it) {
      var tag = it.href ? 'a' : 'div';
      return '<' + tag + ' class="md-card"' + (it.href ? ' href="' + esc(it.href) + '"' : '') + '>' +
        (it.numeral ? '<span class="md-card__num">' + esc(it.numeral) + '</span>' : '') +
        '<div class="md-card__title">' + esc(it.title) + '</div>' +
        (it.desc ? '<p class="md-card__desc">' + inline(it.desc) + '</p>' : '') +
        (it.meta && it.meta.length ? '<div class="md-card__meta">' + it.meta.map(function (m) {
          return '<span class="chip' + (m.brand ? ' chip-brand' : '') + '">' + esc(m.text) + '</span>';
        }).join('') + '</div>' : '') +
        '</' + tag + '>';
    }).join('') + '</div>';
  }

  function signoffHtml() {
    return '<footer class="signoff">' +
      '<p class="signoff__mark">Home of 17.</p>' +
      '<p class="signoff__text">有想法、有不同意见，或者想说说你自己的经验，欢迎写信：' +
      '<a href="mailto:' + esc(window.SITE.email) + '">' + esc(window.SITE.email) + '</a></p></footer>';
  }

  /* ---------------- 读者想说（只在全站最后一页出现） ---------------- */
  function lettersBodyHtml() {
    var L = window.LETTERS;
    if (!L) return '';

    var wall = (L.letters && L.letters.length)
      ? L.letters.map(function (l) {
        return '<article class="letter">' +
          '<header class="letter__meta">' +
          '<span class="letter__name">' + esc(l.name || '匿名') + '</span>' +
          (l.date ? '<time class="letter__date">' + esc(l.date) + '</time>' : '') +
          '</header>' +
          '<p class="letter__text">' + inline(l.text) + '</p>' +
          (l.reply ? '<p class="letter__reply"><span class="letter__reply-label">作者回复</span>' +
            inline(l.reply) + '</p>' : '') +
          '</article>';
      }).join('')
      : '<p class="letters__empty">' + esc(L.wallEmpty) + '</p>';

    return '<section class="letters" id="letters" data-letters>' +
      '<div class="letters__prompts">' +
      '<p class="letters__prompts-title">' + esc(L.promptsTitle) + '</p>' +
      '<ul>' + (L.prompts || []).map(function (p) { return '<li>' + inline(p) + '</li>'; }).join('') + '</ul>' +
      '</div>' +

      '<form class="letters__form" data-lt-form novalidate>' +
      '<div class="field"><label for="ltName">' + esc(L.signLabel) + '</label>' +
      '<input type="text" id="ltName" maxlength="24" autocomplete="off" placeholder="' + esc(L.signPlaceholder) + '"></div>' +
      '<div class="field"><label for="ltText">' + esc(L.textLabel) + '</label>' +
      '<textarea id="ltText" rows="6" maxlength="1500" placeholder="' + esc(L.textPlaceholder) + '"></textarea></div>' +
      '<div class="btn-row">' +
      '<button class="btn btn-sm btn-primary" type="button" data-lt="save">' + esc(L.saveBtn) + '</button>' +
      '<button class="btn btn-sm" type="button" data-lt="mail">' + esc(L.mailBtn) + '</button>' +
      '<button class="btn btn-sm btn-ghost" type="button" data-lt="copy">' + esc(L.copyBtn) + '</button>' +
      '<button class="btn btn-sm btn-ghost" type="button" data-lt="clear">' + esc(L.clearBtn) + '</button>' +
      '</div></form>' +

      '<p class="letters__note">' + inline(L.note) +
      '　也可以直接写信到 <a href="mailto:' + esc(window.SITE.email) + '?subject=' +
      encodeURIComponent('读者想说｜Home of 17.') + '">' + esc(window.SITE.email) + '</a></p>' +

      '<div class="letters__mine" data-lt-mine hidden>' +
      '<h3>' + esc(L.mineTitle) + ' <span class="chip" data-lt-count>0</span></h3>' +
      '<p class="letters__mine-note">' + esc(L.mineNote) + '</p>' +
      '<div class="letters__list" data-lt-list></div>' +
      '</div>' +

      '<h3 class="letters__wall-title">' + esc(L.wallTitle) + '</h3>' +
      '<p class="letters__wall-note">' + esc(L.wallNote) + '</p>' +
      '<div class="letters__wall" data-lt-wall>' + wall + '</div>' +

      '<div class="letters__embed" data-comments hidden></div>' +
      '</section>';
  }

  function lettersPageHtml() {
    var L = window.LETTERS;
    return pageWrap(
      '<p class="kicker">写在最后</p>' +
      '<h1 id="letters-title">' + esc(L.title) + '</h1>' +
      '<p class="lead-xl">' + inline(L.lead) + '</p>' +
      lettersBodyHtml(), 'letters');
  }

  function pageWrap(body, pageId, opts) {
    opts = opts || {};
    return '<article class="md-content" data-page="' + esc(pageId || '') + '">' +
      '<nav class="md-breadcrumbs" data-crumb aria-label="位置"></nav>' + body +
      (opts.noSignoff ? '' : signoffHtml()) +
      '<nav class="md-prevnext" data-prevnext aria-label="翻页"></nav></article>';
  }

  /* ---------------- 首页 ---------------- */
  function homeHtml() {
    var d = window.HOME;
    var ideas = '<div class="idea-grid">' + d.ideas.map(function (it) {
      return '<a class="idea-card" href="' + esc(it.href) + '">' +
        '<span class="idea-card__num">' + esc(it.numeral) + '</span>' +
        '<h2 class="idea-card__title">' + esc(it.title) + '</h2>' +
        '<p class="idea-card__text">' + inline(it.text) + '</p>' +
        '<span class="idea-card__more">阅读这一章 →</span></a>';
    }).join('') + '</div>';

    var chapters = '<ol class="chapter-list">' + (window.MODULES || []).map(function (m) {
      var n = 0;
      m.groups.forEach(function (g) { n += g.articles.length; });
      return '<li><a href="#/' + m.id + '">' +
        '<span class="chapter-list__num">' + esc(m.numeral) + '</span>' +
        '<span class="chapter-list__body"><span class="chapter-list__title">' + esc(m.title) + '</span>' +
        '<span class="chapter-list__sub">' + esc(m.subtitle) + '</span></span>' +
        '<span class="chapter-list__meta">' + n + ' 篇</span></a></li>';
    }).join('') + '</ol>';

    var entries = cardsHtml(d.entries.map(function (e) {
      return { title: e.title, desc: e.text, href: e.href };
    }));

    return pageWrap(
      '<p class="kicker">' + esc(d.kicker) + '</p>' +
      '<h1 class="display">' + esc(d.title) + '</h1>' +
      '<p class="lead-xl">' + inline(d.lead) + '</p>' +
      '<div class="home__cta">' +
      '<a class="btn btn-primary" href="#/preface">先读卷首 →</a>' +
      '<a class="btn btn-outline" href="#/why">从第一章开始</a></div>' +
      '<hr class="rule rule--heavy">' +
      ideas +
      '<blockquote class="pullquote"><p>' + inline(d.quote.x) + '</p>' +
      (d.quote.by ? '<cite>—— ' + esc(d.quote.by) + '</cite>' : '') + '</blockquote>' +
      '<h2 id="home-chapters">章节</h2>' + chapters +
      '<h2 id="home-entries">其他入口</h2>' + entries,
      'home', { noSignoff: true }) ;
  }

  /* ---------------- 卷首 ---------------- */
  function prefaceHtml() {
    var p = window.PREFACE;
    return pageWrap(
      '<p class="kicker">' + esc(p.numeral) + (p.updated ? ' · ' + esc(p.updated) : '') + '</p>' +
      '<h1>' + esc(p.title) + '</h1>' +
      '<p class="lead-xl">' + inline(p.lead) + '</p>' +
      p.blocks.map(function (b, i) { return blockHtml(b, 'preface-' + i); }).join('') +
      '<hr class="rule">' +
      '<p class="tiny muted">这一页会持续补充。想改这段文字，编辑 <code>assets/js/data-content.js</code> 里的 ' +
      '<code>PREFACE.blocks</code> 即可。</p>',
      'preface');
  }

  /* ---------------- 模块页 ---------------- */
  function moduleHtml(mod) {
    var single = mod.groups.length === 1;
    var groups = mod.groups.map(function (g) {
      var cards = cardsHtml(g.articles.map(function (a) {
        return {
          title: a.title, desc: a.lead, href: '#/' + mod.id + '/' + a.id,
          meta: (a.tags || []).map(function (t) { return { text: t }; })
            .concat([{ text: '约 ' + (a.minutes || 5) + ' 分钟', brand: true }])
        };
      }));
      if (single) return cards;
      return '<h2 id="g-' + esc(g.id) + '">' + esc(g.title) +
        '<button class="headerlink" type="button" data-anchor="g-' + esc(g.id) + '" title="复制本小节链接">¶</button></h2>' +
        '<p class="muted small">' + esc(g.summary) + '</p>' + cards;
    }).join('');

    return pageWrap(
      '<p class="kicker">第 ' + esc(mod.numeral) + ' 章</p>' +
      '<h1>' + esc(mod.title) + '</h1>' +
      '<p class="lead-xl">' + esc(mod.subtitle) + '</p>' +
      '<p>' + esc(mod.intro) + '</p>' +
      '<hr class="rule">' + groups, mod.id);
  }

  /* ---------------- 文章页 ---------------- */
  function articleHtml(mod, group, article) {
    article._uid = mod.id + '-' + article.id;
    var chips = '<div class="md-chips">' +
      '<span class="chip chip-brand">第 ' + esc(mod.numeral) + ' 章 · ' + esc(mod.title) + '</span>' +
      (article.tags || []).map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('') +
      '<span class="chip">约 ' + (article.minutes || 5) + ' 分钟</span></div>';

    return pageWrap(
      '<h1>' + esc(article.title) + '</h1>' +
      '<p class="lead-xl">' + inline(article.lead) + '</p>' + chips +
      bodyHtml(article) +
      '<div class="md-actions">' +
      '<button class="btn btn-sm" type="button" data-print="' + esc(article.title) + '">打印这一篇</button>' +
      '<a class="btn btn-sm btn-ghost" href="#/' + mod.id + '">← 返回' + esc(mod.title) + '</a>' +
      '</div>', mod.id + '/' + article.id);
  }

  /* ---------------- 方法与工具 ---------------- */
  function toolsIndexHtml() {
    return pageWrap(
      '<p class="kicker">方法与工具</p>' +
      '<h1>可以直接用的工具</h1>' +
      '<p class="lead-xl">八个不用注册、立刻能上手的小工具。所有数据只保存在你自己的浏览器里。</p>' +
      cardsHtml((window.TOOLS || []).map(function (t) {
        return { title: t.title, desc: t.desc, href: '#/tools/' + t.id, meta: [{ text: '打开 →', brand: true }] };
      })) +
      '<h2 id="tools-data">数据管理</h2>' +
      '<p>状态记录、复盘、清单勾选、任务清单等数据都存放在本浏览器，换设备不会同步，建议定期导出备份。</p>' +
      '<div class="btn-row"><button class="btn btn-sm" type="button" id="exportAll">导出全部数据（JSON）</button>' +
      '<button class="btn btn-sm btn-danger" type="button" id="clearAll">清空全部记录</button></div>',
      'tools');
  }

  function toolPageHtml(id) {
    var t = (window.TOOLS || []).filter(function (x) { return x.id === id; })[0];
    if (!t) return notFound('没有找到这个工具');
    return pageWrap(
      '<h1>' + esc(t.title) + '</h1>' +
      '<p class="lead-xl">' + esc(t.desc) + '</p>' +
      '<p class="tool-note">' + esc(t.note) + '</p>' +
      (window.TOOLVIEWS && window.TOOLVIEWS[id] ? window.TOOLVIEWS[id]() : '<div class="empty">工具加载中…</div>') +
      '<div class="md-actions"><a class="btn btn-sm btn-ghost" href="#/tools">← 全部工具</a></div>',
      'tools/' + id);
  }

  /* ---------------- 资源库 ---------------- */
  function resourcesHtml() {
    var cats = window.RESOURCES || [];
    var total = cats.reduce(function (n, c) { return n + c.items.length; }, 0);

    var nav = '<div class="btn-row" style="margin-bottom:22px">' + cats.map(function (c) {
      return '<a class="btn btn-sm" href="#res-' + c.id + '">' + esc(c.title) + '</a>';
    }).join('') + '</div>';

    var body = cats.map(function (c) {
      return '<section class="res-cat" id="res-' + c.id + '">' +
        '<h2>' + esc(c.title) + '<span class="chip">' + c.items.length + ' 条</span>' +
        '<button class="headerlink" type="button" data-anchor="res-' + c.id + '" title="复制本小节链接">¶</button></h2>' +
        '<p class="muted small">' + esc(c.desc) + '</p>' +
        '<div class="res-list">' + c.items.map(function (it) {
          var link = it.url || it.href;
          var nameHtml = link
            ? '<a href="' + esc(link) + '"' + (/^https?:/i.test(link) ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + esc(it.name) + '</a>'
            : esc(it.name);
          return '<div class="res-item"><div class="res-name">' + nameHtml +
            (it.by ? '<span class="res-by">' + esc(it.by) + '</span>' : '') + '</div>' +
            '<p class="res-desc">' + inline(it.desc) + '</p>' +
            '<div class="res-tags">' + (it.tags || []).map(function (t) {
              return '<span class="chip">' + esc(t) + '</span>';
            }).join('') + '</div></div>';
        }).join('') + '</div></section>';
    }).join('');

    return pageWrap(
      '<p class="kicker">资源库</p>' +
      '<h1>读什么，看什么，听什么</h1>' +
      '<p class="lead-xl">共 ' + total + ' 条。书单不是任务清单——挑一条开始就好，不必全看。</p>' +
      nav + body, 'resources');
  }

  /* ---------------- 需要帮助时 ---------------- */
  function helpHtml() {
    var h = window.HELP;
    return pageWrap(
      '<p class="kicker">关于本站 · 附录</p>' +
      '<h1>' + esc(h.title) + '</h1>' +
      '<p class="lead-xl">' + esc(h.lead) + '</p>' +
      h.blocks.map(function (b, i) { return blockHtml(b, 'help-' + i); }).join('') +
      '<h2 id="help-tel">可以拨打的电话</h2>' +
      (h.hotlines || []).map(function (x) {
        return '<div class="hotline"><div><div class="num">' + esc(x.num) + '</div>' +
          '<div><strong>' + esc(x.name) + '</strong></div>' +
          '<div class="meta">' + esc(x.meta) + '</div></div>' +
          '<a class="btn btn-sm" href="tel:' + esc(x.tel) + '">拨打</a></div>';
      }).join('') +
      '<p class="tiny muted">' + h.notes.map(esc).join('　') + '</p>', 'help');
  }

  /* ---------------- 关于 ---------------- */
  function aboutHtml() {
    var a = window.ABOUT;
    return pageWrap('<p class="kicker">关于本站</p>' +
      '<h1>' + esc(a.title) + '</h1>' +
      '<p class="lead-xl">' + inline(a.lead) + '</p>' +
      a.blocks.map(function (b, i) { return blockHtml(b, 'about-' + i); }).join('') +
      '<div class="md-actions"><a class="btn btn-sm" href="#/help">需要帮助时 →</a>' +
      '<a class="btn btn-sm btn-ghost" href="mailto:' + esc(window.SITE.email) + '">写信给作者</a></div>',
      'about');
  }

  function notFound(msg) {
    return pageWrap('<h1>页面不存在</h1><p class="lead-xl">' + esc(msg || '没有找到这个页面。') + '</p>' +
      '<p><a class="btn btn-primary" href="#/home">回到首页</a></p>', '404', { noSignoff: true });
  }

  /* ---------------- 搜索索引 ---------------- */
  var INDEX = null;
  function buildIndex() {
    if (INDEX) return INDEX;
    INDEX = [];
    INDEX.push({ type: '卷首', path: ['卷首'], title: window.PREFACE.title, href: '#/preface',
      text: (window.PREFACE.lead + ' ' + window.PREFACE.blocks.map(function (b) {
        if (b.x && typeof b.x === 'string') return b.x;
        if (b.x && b.x.length && typeof b.x[0] === 'string') return b.x.join(' ');
        if (b.t === 'table') return b.head.join(' ') + ' ' + b.rows.map(function (r) { return r.join(' '); }).join(' ');
        if (b.t === 'steps') return b.x.map(function (s) { return s.title + ' ' + (s.x || ''); }).join(' ');
        return '';
      }).join(' ')).replace(/[*`]/g, '') });

    allArticles().forEach(function (item) {
      var a = item.article;
      var text = [a.title, a.lead].concat(
        a.body.map(function (b) {
          if (b.t === 'table') return b.head.join(' ') + ' ' + b.rows.map(function (r) { return r.join(' '); }).join(' ');
          if (b.t === 'steps') return b.x.map(function (s) { return s.title + ' ' + (s.x || ''); }).join(' ');
          if (b.t === 'kv') return b.x.map(function (p) { return p.join(' '); }).join(' ');
          if (b.x && typeof b.x === 'string') return b.x;
          if (b.x && b.x.length && typeof b.x[0] === 'string') return b.x.join(' ');
          return '';
        })
      ).join(' ').replace(/[*`]/g, '');
      INDEX.push({
        type: '第 ' + item.module.numeral + ' 章 · ' + item.module.title,
        path: ['第 ' + item.module.numeral + ' 章', item.module.title],
        title: a.title, href: '#/' + item.module.id + '/' + a.id, text: text
      });
    });

    (window.TOOLS || []).forEach(function (t) {
      INDEX.push({ type: '方法与工具', path: ['方法与工具'], title: t.title, href: '#/tools/' + t.id,
        text: t.title + ' ' + t.desc + ' ' + t.note });
    });
    (window.RESOURCES || []).forEach(function (c) {
      c.items.forEach(function (it) {
        INDEX.push({
          type: '资源库', path: ['资源库', c.title], title: it.name,
          href: it.url || it.href || '#/resources',
          text: it.name + ' ' + (it.by || '') + ' ' + it.desc + ' ' + (it.tags || []).join(' ')
        });
      });
    });
    INDEX.push({ type: '关于本站', path: ['关于本站'], title: window.ABOUT.title, href: '#/about',
      text: window.ABOUT.lead + ' ' + window.ABOUT.blocks.map(function (b) {
        if (b.x && typeof b.x === 'string') return b.x;
        if (b.x && b.x.length && typeof b.x[0] === 'string') return b.x.join(' ');
        if (b.t === 'table') return b.head.join(' ') + ' ' + b.rows.map(function (r) { return r.join(' '); }).join(' ');
        return '';
      }).join(' ') });
    INDEX.push({ type: '读者想说', path: ['读者想说'], title: window.LETTERS.title, href: '#/letters',
      text: window.LETTERS.title + ' ' + window.LETTERS.lead + ' ' + (window.LETTERS.prompts || []).join(' ') + ' 留言 感想 反馈 联系作者' });
    INDEX.push({ type: '关于本站', path: ['关于本站', '需要帮助时'], title: window.HELP.title, href: '#/help',
      text: window.HELP.lead + ' ' + (window.HELP.hotlines || []).map(function (x) { return x.num + ' ' + x.name; }).join(' ') });
    return INDEX;
  }

  function search(q) {
    var idx = buildIndex();
    var kw = String(q || '').trim().toLowerCase();
    if (kw.length < 1) return [];
    var parts = kw.split(/\s+/).filter(Boolean);
    var out = [];
    idx.forEach(function (item) {
      var t = (item.title || '').toLowerCase();
      var all = (item.text || '').toLowerCase();
      var score = 0, ok = true;
      parts.forEach(function (p) {
        var inT = t.indexOf(p) >= 0, inA = all.indexOf(p) >= 0;
        if (!inT && !inA) { ok = false; return; }
        score += inT ? 10 : 3;
      });
      if (!ok) return;
      var pos = all.indexOf(parts[0]);
      var snip = pos >= 0
        ? (pos > 20 ? '…' : '') + item.text.slice(Math.max(0, pos - 20), pos + 90) + '…'
        : item.text.slice(0, 90) + '…';
      out.push({ type: item.type, title: item.title, path: item.path, href: item.href, snippet: snip, score: score });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, 30);
  }

  /* ---------------- 导出 ---------------- */
  R.esc = esc;
  R.inline = inline;
  R.blockHtml = blockHtml;
  R.getModule = getModule;
  R.getArticle = getArticle;
  R.allArticles = allArticles;
  R.moduleLabel = moduleLabel;
  R.flatPages = flatPages;
  R.cardsHtml = cardsHtml;
  R.homeHtml = homeHtml;
  R.lettersPageHtml = lettersPageHtml;
  R.prefaceHtml = prefaceHtml;
  R.moduleHtml = moduleHtml;
  R.articleHtml = articleHtml;
  R.toolsIndexHtml = toolsIndexHtml;
  R.toolPageHtml = toolPageHtml;
  R.resourcesHtml = resourcesHtml;
  R.helpHtml = helpHtml;
  R.aboutHtml = aboutHtml;
  R.notFound = notFound;
  R.search = search;
  window.R = R;
})();
