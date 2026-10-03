/* ==========================================================================
   心桥 · 交互工具层
   所有数据存放在浏览器 localStorage，不上传任何服务器。
   ========================================================================== */
(function () {
  'use strict';

  var esc = window.R.esc;
  var PREFIX = 'xinqiao.v1.';

  /* ---------------- 本地存储 ---------------- */
  var Store = {
    load: function (k, d) {
      try { var v = localStorage.getItem(PREFIX + k); return v ? JSON.parse(v) : d; }
      catch (e) { return d; }
    },
    save: function (k, v) {
      try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); return true; }
      catch (e) { return false; }
    },
    del: function (k) { try { localStorage.removeItem(PREFIX + k); } catch (e) { } },
    keys: function () {
      var out = [];
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(PREFIX) === 0) out.push(k.slice(PREFIX.length));
        }
      } catch (e) { }
      return out;
    },
    dump: function () {
      var o = {};
      Store.keys().forEach(function (k) { o[k] = Store.load(k, null); });
      return o;
    },
    clearAll: function () { Store.keys().forEach(function (k) { Store.del(k); }); }
  };
  window.Store = Store;

  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); setTimeout(function () { el.hidden = true; }, 220); }, 1900);
  }
  window.toast = toast;

  function localDate(d) {
    d = d || new Date();
    var m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (dd < 10 ? '0' + dd : dd);
  }

  function printHtml(html) {
    var pa = document.getElementById('printArea');
    if (!pa) return;
    pa.innerHTML = html;
    document.body.classList.add('printing-area');
    var done = function () {
      document.body.classList.remove('printing-area');
      pa.innerHTML = '';
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    setTimeout(function () { window.print(); }, 60);
    setTimeout(done, 6000);
  }
  window.printHtml = printHtml;

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('已复制到剪贴板'); }, function () { fallbackCopy(text); });
    } else { fallbackCopy(text); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('已复制'); } catch (e) { toast('复制失败，请手动选择'); }
    document.body.removeChild(ta);
  }
  function download(name, text, type) {
    var blob = new Blob(['\ufeff' + text], { type: (type || 'text/plain') + ';charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ======================================================================
     TOOLVIEWS：每个工具返回初始 HTML
     ====================================================================== */
  var TOOLVIEWS = {};

  /* ---------- 1. 呼吸训练器 ---------- */
  TOOLVIEWS.breathing = function () {
    return '<div class="tool-card">' +
      '<div class="btn-row" id="breathePresets">' +
      '<button class="btn btn-sm btn-primary" data-preset="478">4-7-8 放松助眠</button>' +
      '<button class="btn btn-sm" data-preset="box">箱式呼吸 4-4-6-2</button>' +
      '<button class="btn btn-sm" data-preset="66">平衡呼吸 6-6</button>' +
      '<button class="btn btn-sm btn-ghost" id="breatheSound">提示音：关</button>' +
      '</div>' +
      '<div class="breathe-stage"><div class="breathe-ring idle" id="breatheRing">' +
      '<div class="breathe-circle" id="breatheCircle"></div>' +
      '<div class="breathe-core"><div class="breathe-phase" id="breathePhase">准备开始</div>' +
      '<div class="breathe-count" id="breatheCount">—</div></div></div></div>' +
      '<div class="breathe-info" id="breatheHint">选择一个节奏，点「开始」。眼睛可以闭上，也可以盯着圆圈。</div>' +
      '<div class="breathe-stats"><span>已完成 <b id="breatheCycles">0</b> 轮</span><span>用时 <b id="breatheTime">0:00</b></span></div>' +
      '<div class="btn-row center" style="justify-content:center;margin-top:16px">' +
      '<button class="btn btn-primary" id="breatheStart">开始</button>' +
      '<button class="btn" id="breatheStop">停止</button>' +
      '<button class="btn btn-ghost" id="breatheReset">重置</button></div>' +
      '<p class="tiny muted" style="margin-top:14px">要点：呼气要比吸气长。如果感到头晕，请缩短时长或恢复正常呼吸。</p>' +
      '</div>';
  };

  /* ---------- 2. 每日状态记录 ---------- */
  TOOLVIEWS.mood = function () {
    var tags = ['平静', '专注', '充实', '清醒', '轻松', '疲惫', '烦躁', '低落', '紧张', '迷茫', '焦虑', '无力'];
    return '<div class="tool-card">' +
      '<div class="tool-grid">' +
      '<div>' +
      '<div class="field"><label>日期</label><input type="date" id="mDate" value="' + localDate() + '"></div>' +
      '<div class="field"><label>此刻的状态：<b id="mVal">5</b> / 10（1 很差，10 很好）</label>' +
      '<input type="range" id="mMood" min="1" max="10" value="5"></div>' +
      '<div class="field"><label>状态词（可多选）</label><div class="tag-picker" id="mTags">' +
      tags.map(function (t) { return '<button type="button" data-tag="' + t + '">' + t + '</button>'; }).join('') +
      '</div></div>' +
      '</div>' +
      '<div>' +
      '<div class="field"><label>发生了什么事？（客观描述）</label><textarea id="mEvent" placeholder="例：数学周测 68 分，同桌考了 92。"></textarea></div>' +
      '<div class="field"><label>脑子里冒出的第一句话</label><textarea id="mThink" placeholder="例：我果然学不好数学，高考肯定完了。"></textarea></div>' +
      '<div class="field"><label>我做了什么 / 我可以做什么</label><textarea id="mAction" placeholder="例：去操场走了 10 分钟；明天找老师问一下函数那块。"></textarea></div>' +
      '</div></div>' +
      '<div class="btn-row"><button class="btn btn-primary" id="mSave">保存这条记录</button>' +
      '<button class="btn" id="mExport">导出 CSV</button>' +
      '<button class="btn btn-ghost" id="mPrint">打印记录</button>' +
      '<button class="btn btn-danger btn-sm" id="mClear">清空全部</button></div>' +
      '<p class="tiny muted" style="margin-top:10px">记录的作用不是"变好"，而是让你看见规律：什么时间、什么情境最容易让你难受。</p>' +
      '</div>' +
      '<div class="tool-card"><h3>状态趋势（最近 14 条）</h3>' +
      '<div class="chart-wrap"><canvas id="mChart" width="900" height="260"></canvas></div>' +
      '<div id="mList" class="record-list"></div></div>';
  };

  /* ---------- 4. 想法记录表 ---------- */
  TOOLVIEWS.thought = function () {
    return '<div class="tool-card">' +
      '<p class="tool-note">按顺序填。第 4 栏最重要：像律师一样，为两边各找证据。</p>' +
      '<div class="field"><label>1. 情境：发生了什么？（只写事实，不写评价）</label>' +
      '<textarea id="t1" placeholder="例：今天上课回答问题答错了，同学笑了一下。"></textarea></div>' +
      '<div class="field"><label>2. 自动想法：脑子里第一句话是什么？</label>' +
      '<textarea id="t2" placeholder="例：他们一定觉得我很蠢。"></textarea>' +
      '<label style="margin-top:8px">我有多相信它：<b id="tBeliefV">70</b>%</label>' +
      '<input type="range" id="tBelief" min="0" max="100" value="70" step="5"></div>' +
      '<div class="field"><label>3. 当时的感受：难受的程度大概是多少？</label>' +
      '<textarea id="t3" placeholder="例：羞耻 80%，想钻到桌子底下。"></textarea></div>' +
      '<div class="tool-grid">' +
      '<div class="field"><label>4a. 支持这个想法的证据</label><textarea id="t4a" placeholder="例：我确实答错了；有两个人笑了。"></textarea></div>' +
      '<div class="field"><label>4b. 反对这个想法的证据</label><textarea id="t4b" placeholder="例：笑的人可能是在笑别的；下课后有人主动跟我讨论题；我上一次答对时没人说什么。"></textarea></div>' +
      '</div>' +
      '<div class="field"><label>5. 更准确的想法（不必更积极，要更准确）</label>' +
      '<textarea id="t5" placeholder="例：我这次答错了，说明这个知识点没掌握；至于别人怎么想，我并不知道，而且一次答错不会决定他们对我的看法。"></textarea>' +
      '<label style="margin-top:8px">现在的相信程度：<b id="tBelief2V">40</b>%</label>' +
      '<input type="range" id="tBelief2" min="0" max="100" value="40" step="5"></div>' +
      '<div class="field"><label>现在的难受程度：<b id="tMood2V">50</b>%</label>' +
      '<input type="range" id="tMood2" min="0" max="100" value="50" step="5"></div>' +
      '<div class="btn-row"><button class="btn btn-primary" id="tSave">保存这张表</button>' +
      '<button class="btn" id="tPrintOne">打印当前这张</button>' +
      '<button class="btn btn-ghost" id="tPrintBlank">打印空白表</button>' +
      '<button class="btn btn-ghost" id="tClearForm">清空表单</button></div>' +
      '</div>' +
      '<div class="tool-card"><h3>已保存的记录 <span class="chip" id="tCount">0</span></h3>' +
      '<div id="tList" class="record-list"></div>' +
      '<div class="btn-row" style="margin-top:12px"><button class="btn btn-sm" id="tExport">导出全部（JSON）</button>' +
      '<button class="btn btn-sm btn-danger" id="tClearAll">清空全部记录</button></div></div>';
  };

  /* ---------- 5. 番茄钟 ---------- */
  TOOLVIEWS.pomodoro = function () {
    return '<div class="tool-grid">' +
      '<div class="tool-card"><h3>专注计时</h3>' +
      '<div class="btn-row" id="pPresets" style="margin-bottom:6px">' +
      '<button class="btn btn-sm" data-work="25" data-break="5">25 / 5</button>' +
      '<button class="btn btn-sm" data-work="45" data-break="10">45 / 10</button>' +
      '<button class="btn btn-sm" data-work="15" data-break="3">15 / 3</button>' +
      '<button class="btn btn-sm" data-work="50" data-break="10">50 / 10</button></div>' +
      '<div class="timer-display work" id="pDisplay">25:00</div>' +
      '<div class="timer-bar"><i id="pBar"></i></div>' +
      '<div class="center muted small" id="pPhase">专注阶段 · 今日已完成 <b id="pDone">0</b> 个番茄</div>' +
      '<div class="btn-row" style="justify-content:center;margin-top:14px">' +
      '<button class="btn btn-primary" id="pStart">开始</button>' +
      '<button class="btn" id="pPause">暂停</button>' +
      '<button class="btn btn-ghost" id="pReset">重置</button></div>' +
      '<div class="tool-grid" style="margin-top:14px">' +
      '<div class="field"><label>专注时长（分钟）</label><input type="number" id="pWork" value="25" min="1" max="120"></div>' +
      '<div class="field"><label>休息时长（分钟）</label><input type="number" id="pBreak" value="5" min="1" max="60"></div>' +
      '</div>' +
      '<p class="tiny muted">提示：开始后页面标题会显示剩余时间，方便切到别的标签页时查看。</p>' +
      '</div>' +
      '<div class="tool-card"><h3>任务清单</h3>' +
      '<p class="tool-note">把任务写得越小越具体越好，例如"做 3 道导数错题"。</p>' +
      '<div class="btn-row"><input type="text" id="pTaskInput" placeholder="新增任务…" style="flex:1;min-width:150px">' +
      '<button class="btn btn-primary btn-sm" id="pTaskAdd">添加</button></div>' +
      '<div class="task-list" id="pTasks"></div>' +
      '<div class="btn-row" style="margin-top:12px"><button class="btn btn-sm btn-ghost" id="pTaskClear">清空已完成</button></div>' +
      '</div></div>';
  };

  /* ---------- 6. 目标与计划生成器 ---------- */
  TOOLVIEWS.planner = function () {
    return '<div class="tool-grid">' +
      '<div class="tool-card"><h3>输入你的目标</h3>' +
      '<div class="field"><label>你想达成什么？（大目标）</label><input type="text" id="gGoal" placeholder="例：把数学提上去"></div>' +
      '<div class="field"><label>怎么算达成？（可衡量的数字）</label><input type="text" id="gMeasure" placeholder="例：月考数学达到 105 分"></div>' +
      '<div class="field"><label>截止时间</label><input type="text" id="gWhen" placeholder="例：5 月 20 日的月考"></div>' +
      '<div class="field"><label>为什么这个目标对我重要？（找到你自己的理由）</label><input type="text" id="gWhy" placeholder="例：想进那个专业，数学是门槛"></div>' +
      '<div class="field"><label>触发情境（如果……）</label><input type="text" id="gTrigger" placeholder="例：每天晚自习铃响、坐到座位上"></div>' +
      '<div class="field"><label>最小行动（那么我就……）</label><input type="text" id="gAction" placeholder="例：先做 3 道函数错题"></div>' +
      '<div class="field"><label>备用计划（如果做不到，那么至少……）</label><input type="text" id="gFallback" placeholder="例：至少读一遍错题本"></div>' +
      '<div class="btn-row"><button class="btn btn-primary" id="gGen">生成我的计划</button>' +
      '<button class="btn btn-ghost" id="gFill">填个示例</button></div></div>' +
      '<div class="tool-card"><h3>生成结果</h3>' +
      '<div id="gOut"><div class="empty">点「生成我的计划」，这里会输出可以直接抄进备忘录的内容。</div></div>' +
      '<div class="btn-row" style="margin-top:12px"><button class="btn btn-sm" id="gCopy">复制</button>' +
      '<button class="btn btn-sm" id="gPrint">打印</button></div></div></div>';
  };

  /* ---------- 7. 时间四象限 ---------- */
  TOOLVIEWS.matrix = function () {
    var q = [
      { id: 'q1', t: '① 重要 & 紧急', d: '马上做：明天要交的作业、后天要考的重点', c: 'danger' },
      { id: 'q2', t: '② 重要 & 不紧急', d: '计划做：错题整理、薄弱模块补强、睡眠与运动——这一格决定你的长期成绩', c: 'good' },
      { id: 'q3', t: '③ 紧急 & 不重要', d: '快速处理或委托：别人的临时求助、无关紧要的通知', c: 'warn' },
      { id: 'q4', t: '④ 不重要 & 不紧急', d: '尽量删掉：无目的刷手机、内耗式比较', c: 'key' }
    ];
    return '<div class="tool-card">' +
      '<p class="tool-note">每行写一件事。写完点「保存」，数据只存在你的浏览器里。</p>' +
      '<div class="tool-grid">' + q.map(function (x) {
        return '<div><div class="field"><label>' + esc(x.t) + '</label>' +
          '<p class="tiny muted" style="margin:0 0 6px">' + esc(x.d) + '</p>' +
          '<textarea data-q="' + x.id + '" placeholder="一件事一行"></textarea></div></div>';
      }).join('') + '</div>' +
      '<div class="btn-row"><button class="btn btn-primary" id="mxSave">保存</button>' +
      '<button class="btn" id="mxPrint">打印</button>' +
      '<button class="btn btn-ghost" id="mxClear">清空</button></div>' +
      '<p class="tiny muted" style="margin-top:10px">如果第 ② 格长期是空的，成绩很难真正变化——因为所有重要的事最后都会变成紧急的事。</p>' +
      '</div>';
  };

  /* ---------- 8. 每周复盘 ---------- */
  TOOLVIEWS.review = function () {
    var fields = [
      ['r1', '这一周我做对了什么？（哪个方法有效）'],
      ['r2', '这一周我花了时间但没有效果的事是什么？'],
      ['r3', '我最大的一个知识漏洞是什么？（具体到章节）'],
      ['r4', '下周我要改变的一件具体的事是什么？'],
      ['r5', '我的睡眠 / 精神状态 / 身体怎么样？需要调整什么？'],
      ['r6', '这一周有什么让我开心或感激的小事？']
    ];
    return '<div class="tool-card">' +
      '<div class="field" style="max-width:260px"><label>这一周是</label><input type="text" id="rvWeek" placeholder="例：第 8 周（3.18—3.24）"></div>' +
      fields.map(function (f) {
        return '<div class="field"><label>' + esc(f[1]) + '</label><textarea data-r="' + f[0] + '"></textarea></div>';
      }).join('') +
      '<div class="btn-row"><button class="btn btn-primary" id="rvSave">保存本周复盘</button>' +
      '<button class="btn" id="rvPrint">打印这张表</button>' +
      '<button class="btn btn-ghost" id="rvPrintBlank">打印空白表</button>' +
      '<button class="btn btn-ghost" id="rvLoad">载入上次</button></div>' +
      '<p class="tiny muted" style="margin-top:10px">固定每周同一个时间做（例如周日晚自习前 15 分钟），效果最好。</p>' +
      '</div>';
  };

  /* ---------- 9. 考后复盘 ---------- */
  TOOLVIEWS.examreview = function () {
    var types = ['概念不清', '审题失误', '计算错误', '方法不会', '时间不够', '状态影响'];
    return '<div class="tool-card">' +
      '<div class="tool-grid">' +
      '<div class="field"><label>考试名称</label><input type="text" id="erName" placeholder="例：第二次月考"></div>' +
      '<div class="field"><label>日期</label><input type="date" id="erDate" value="' + localDate() + '"></div>' +
      '</div>' +
      '<p class="tool-note">按科目填写各类型失分的大致分值（估算即可），系统会帮你找出最该补的洞。</p>' +
      '<div class="table-wrap"><table id="erTable"><thead><tr><th>科目</th><th>得分 / 满分</th>' +
      types.map(function (t) { return '<th>' + t + '</th>'; }).join('') + '<th></th></tr></thead>' +
      '<tbody></tbody></table></div>' +
      '<div class="btn-row"><button class="btn btn-sm" id="erAddRow">＋ 添加科目</button>' +
      '<button class="btn btn-primary btn-sm" id="erCalc">分析失分结构</button>' +
      '<button class="btn btn-sm" id="erPrint">打印</button>' +
      '<button class="btn btn-sm btn-ghost" id="erSave">保存</button>' +
      '<button class="btn btn-sm btn-ghost" id="erLoad">载入上次</button></div>' +
      '<div id="erOut" style="margin-top:16px"></div>' +
      '</div>';
  };

  window.TOOLVIEWS = TOOLVIEWS;

  /* ======================================================================
     TOOLS_INIT：每个工具的交互逻辑
     ====================================================================== */
  var INIT = {};

  /* ---------- 1. 呼吸 ---------- */
  INIT.breathing = function () {
    var PRESETS = {
      '478': { name: '4-7-8 放松助眠', phases: [
        { n: '吸气', s: 4, to: 'in' }, { n: '屏住', s: 7, to: 'hold' }, { n: '呼气', s: 8, to: 'out' }] },
      'box': { name: '箱式呼吸 4-4-6-2', phases: [
        { n: '吸气', s: 4, to: 'in' }, { n: '屏息', s: 4, to: 'hold' }, { n: '呼气', s: 6, to: 'out' }, { n: '停留', s: 2, to: 'hold' }] },
      '66': { name: '平衡呼吸 6-6', phases: [
        { n: '吸气', s: 6, to: 'in' }, { n: '呼气', s: 6, to: 'out' }] }
    };
    var ring = document.getElementById('breatheRing');
    var circle = document.getElementById('breatheCircle');
    var phaseEl = document.getElementById('breathePhase');
    var countEl = document.getElementById('breatheCount');
    var hintEl = document.getElementById('breatheHint');
    var cyclesEl = document.getElementById('breatheCycles');
    var timeEl = document.getElementById('breatheTime');
    if (!ring || !circle) return;

    var cur = PRESETS['478'], sound = false, timer = null, phaseIdx = 0, remain = 0, cycles = 0, elapsed = 0, running = false;
    var ac = null;

    function beep(freq) {
      if (!sound) return;
      try {
        ac = ac || new (window.AudioContext || window.webkitAudioContext)();
        var o = ac.createOscillator(), g = ac.createGain();
        o.frequency.value = freq; o.type = 'sine';
        g.gain.value = 0.05;
        o.connect(g); g.connect(ac.destination);
        o.start();
        o.stop(ac.currentTime + 0.12);
      } catch (e) { }
    }

    function applyPhase() {
      var p = cur.phases[phaseIdx];
      phaseEl.textContent = p.n;
      countEl.textContent = p.s;
      ring.classList.remove('idle');
      if (p.to === 'in') { circle.style.transitionDuration = p.s + 's'; circle.classList.add('grow'); }
      else if (p.to === 'out') { circle.style.transitionDuration = p.s + 's'; circle.classList.remove('grow'); }
      else { circle.style.transitionDuration = '0s'; }
      beep(p.to === 'in' ? 660 : (p.to === 'out' ? 440 : 550));
    }

    function tick() {
      if (!running) return;
      remain--;
      elapsed++;
      countEl.textContent = remain > 0 ? remain : 1;
      timeEl.textContent = Math.floor(elapsed / 60) + ':' + ('0' + (elapsed % 60)).slice(-2);
      if (remain <= 0) {
        phaseIdx++;
        if (phaseIdx >= cur.phases.length) { phaseIdx = 0; cycles++; cyclesEl.textContent = cycles; }
        remain = cur.phases[phaseIdx].s;
        applyPhase();
      }
    }

    function start() {
      if (running) return;
      running = true;
      remain = remain || cur.phases[phaseIdx].s;
      applyPhase();
      hintEl.textContent = '跟着圆圈：变大时吸气，缩小时呼气，停住时保持。';
      timer = setInterval(tick, 1000);
    }
    function stop() {
      running = false;
      clearInterval(timer); timer = null;
      hintEl.textContent = '已暂停。随时可以继续。';
    }
    function reset() {
      stop(); phaseIdx = 0; remain = 0; cycles = 0; elapsed = 0;
      cyclesEl.textContent = '0'; timeEl.textContent = '0:00';
      phaseEl.textContent = '准备开始'; countEl.textContent = '—';
      ring.classList.add('idle');
      circle.style.transitionDuration = '0.6s';
      circle.classList.remove('grow');
      hintEl.textContent = '选择一个节奏，点「开始」。眼睛可以闭上，也可以盯着圆圈。';
    }

    document.getElementById('breatheStart').onclick = start;
    document.getElementById('breatheStop').onclick = stop;
    document.getElementById('breatheReset').onclick = reset;
    document.getElementById('breatheSound').onclick = function () {
      sound = !sound;
      this.textContent = '提示音：' + (sound ? '开' : '关');
      if (sound) beep(660);
    };
    document.getElementById('breathePresets').addEventListener('click', function (e) {
      var b = e.target.closest('[data-preset]');
      if (!b) return;
      cur = PRESETS[b.dataset.preset];
      Array.prototype.forEach.call(this.querySelectorAll('.btn'), function (x) {
        x.classList.toggle('btn-primary', x === b);
      });
      reset();
      hintEl.textContent = '已选择：' + cur.name + '。点「开始」。';
    });
    reset();
  };

  /* ---------- 2. 每日状态记录 ---------- */
  INIT.mood = function () {
    var moodEl = document.getElementById('mMood');
    var valEl = document.getElementById('mVal');
    var tagBox = document.getElementById('mTags');
    if (!moodEl) return;
    moodEl.oninput = function () { valEl.textContent = moodEl.value; };
    tagBox.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tag]');
      if (b) b.classList.toggle('on');
    });

    function records() { return Store.load('mood', []); }

    /* 黑白配色：用不同透明度区分状态高低 */
    function ink(a) {
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      return 'rgba(' + (dark ? '255,255,255' : '0,0,0') + ',' + a + ')';
    }
    function color(v) {
      if (v >= 8) return ink(1);
      if (v >= 6) return ink(.72);
      if (v >= 4) return ink(.5);
      if (v >= 3) return ink(.34);
      return ink(.22);
    }

    function draw(list) {
      var cv = document.getElementById('mChart');
      if (!cv) return;
      var dpr = window.devicePixelRatio || 1;
      var w = cv.clientWidth || 600, h = 240;
      cv.width = w * dpr; cv.height = h * dpr;
      var g = cv.getContext('2d');
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      var data = list.slice(-14);
      var line = ink(.14);
      var muted = ink(.5);
      var padL = 34, padR = 12, padT = 14, padB = 26;
      var iw = w - padL - padR, ih = h - padT - padB;
      g.strokeStyle = line; g.lineWidth = 1; g.font = '11px system-ui';
      g.fillStyle = muted;
      for (var v = 0; v <= 10; v += 2) {
        var y = padT + ih - (v / 10) * ih;
        g.beginPath(); g.moveTo(padL, y); g.lineTo(w - padR, y); g.stroke();
        g.fillText(String(v), 12, y + 4);
      }
      if (!data.length) {
        g.fillStyle = muted;
        g.fillText('还没有记录，保存第一条后这里会出现曲线。', padL + 10, padT + ih / 2);
        return;
      }
      var stepX = data.length > 1 ? iw / (data.length - 1) : 0;
      var pts = data.map(function (r, i) {
        return { x: padL + i * stepX, y: padT + ih - (r.mood / 10) * ih, r: r };
      });
      g.beginPath();
      pts.forEach(function (p, i) { i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); });
      g.strokeStyle = ink(.85); g.lineWidth = 2; g.lineJoin = 'round'; g.stroke();
      pts.forEach(function (p) {
        g.beginPath(); g.arc(p.x, p.y, 4, 0, Math.PI * 2);
        g.fillStyle = color(p.r.mood); g.fill();
        g.strokeStyle = ink(.85); g.lineWidth = 1.5; g.stroke();
      });
      g.fillStyle = muted;
      g.fillText(data[0].date.slice(5), padL - 4, h - 8);
      g.fillText(data[data.length - 1].date.slice(5), w - padR - 30, h - 8);
    }

    function render() {
      var list = records();
      var box = document.getElementById('mList');
      draw(list);
      if (!list.length) { box.innerHTML = '<div class="empty">还没有记录。</div>'; return; }
      box.innerHTML = list.slice().reverse().map(function (r, i) {
        var idx = list.length - 1 - i;
        return '<div class="record"><div class="record-top"><span class="record-date">' +
          '<span class="mood-dot" style="background:' + color(r.mood) + '"></span>' + esc(r.date) +
          '　状态 ' + r.mood + '/10</span>' +
          '<button class="btn btn-sm btn-danger" data-del="' + idx + '">删除</button></div>' +
          (r.tags && r.tags.length ? '<div class="record-body">状态词：' + esc(r.tags.join('、')) + '</div>' : '') +
          (r.event ? '<div class="record-body"><b>事件：</b>' + esc(r.event) + '</div>' : '') +
          (r.think ? '<div class="record-body"><b>想法：</b>' + esc(r.think) + '</div>' : '') +
          (r.action ? '<div class="record-body"><b>应对：</b>' + esc(r.action) + '</div>' : '') +
          '</div>';
      }).join('');
      box.querySelectorAll('[data-del]').forEach(function (b) {
        b.onclick = function () {
          var l = records(); l.splice(+b.dataset.del, 1); Store.save('mood', l); render(); toast('已删除');
        };
      });
    }

    document.getElementById('mSave').onclick = function () {
      var rec = {
        date: document.getElementById('mDate').value || localDate(),
        mood: +moodEl.value,
        tags: Array.prototype.map.call(tagBox.querySelectorAll('.on'), function (b) { return b.dataset.tag; }),
        event: document.getElementById('mEvent').value.trim(),
        think: document.getElementById('mThink').value.trim(),
        action: document.getElementById('mAction').value.trim(),
        ts: Date.now()
      };
      var l = records(); l.push(rec);
      l.sort(function (a, b) { return (a.date < b.date ? -1 : a.date > b.date ? 1 : a.ts - b.ts); });
      Store.save('mood', l);
      ['mEvent', 'mThink', 'mAction'].forEach(function (id) { document.getElementById(id).value = ''; });
      tagBox.querySelectorAll('.on').forEach(function (b) { b.classList.remove('on'); });
      render(); toast('已保存，数据只存在你的浏览器里');
    };
    document.getElementById('mExport').onclick = function () {
      var l = records();
      if (!l.length) return toast('还没有记录');
      var csv = '日期,状态,状态词,发生了什么,脑子里的话,我做了什么\n' + l.map(function (r) {
        return [r.date, r.mood, (r.tags || []).join('/'), r.event, r.think, r.action]
          .map(function (x) { return '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"'; }).join(',');
      }).join('\n');
      download('状态记录.csv', csv, 'text/csv');
      toast('已导出 CSV');
    };
    document.getElementById('mPrint').onclick = function () {
      var l = records();
      if (!l.length) return toast('还没有记录');
      printHtml('<h1>每日状态记录</h1><table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:12px">' +
        '<tr><th>日期</th><th>状态</th><th>状态词</th><th>发生了什么</th><th>脑子里的话</th><th>我做了什么</th></tr>' +
        l.map(function (r) {
          return '<tr><td>' + esc(r.date) + '</td><td>' + r.mood + '</td><td>' + esc((r.tags || []).join('、')) +
            '</td><td>' + esc(r.event) + '</td><td>' + esc(r.think) + '</td><td>' + esc(r.action) + '</td></tr>';
        }).join('') + '</table>');
    };
    document.getElementById('mClear').onclick = function () {
      if (confirm('确定清空全部状态记录吗？此操作不可恢复。')) { Store.del('mood'); render(); toast('已清空'); }
    };
    render();
  };

  /* ---------- 4. 想法记录表 ---------- */
  INIT.thought = function () {
    var bel = document.getElementById('tBelief'), bel2 = document.getElementById('tBelief2'), md2 = document.getElementById('tMood2');
    if (!bel) return;
    function bind(range, out) {
      range.oninput = function () { document.getElementById(out).textContent = range.value; };
    }
    bind(bel, 'tBeliefV'); bind(bel2, 'tBelief2V'); bind(md2, 'tMood2V');

    var F = {
      t1: '发生了什么', t2: '脑子里第一句话', t3: '感受', t4a: '支持它的证据', t4b: '反对它的证据', t5: '更准确的说法'
    };
    function gather() {
      var o = {};
      Object.keys(F).forEach(function (k) { o[k] = document.getElementById(k).value.trim(); });
      o.belief = +bel.value; o.belief2 = +bel2.value; o.mood2 = +md2.value;
      o.date = localDate();
      return o;
    }
    function records() { return Store.load('thought', []); }
    function render() {
      var l = records(), box = document.getElementById('tList');
      document.getElementById('tCount').textContent = l.length;
      if (!l.length) { box.innerHTML = '<div class="empty">还没有保存的记录。</div>'; return; }
      box.innerHTML = l.slice().reverse().map(function (r, i) {
        var idx = l.length - 1 - i;
        return '<div class="record"><div class="record-top"><span class="record-date">' + esc(r.date) + '　相信程度 ' +
          r.belief + '% → ' + r.belief2 + '%</span>' +
          '<span><button class="btn btn-sm" data-load="' + idx + '">载入</button> ' +
          '<button class="btn btn-sm btn-danger" data-del="' + idx + '">删除</button></span></div>' +
          Object.keys(F).filter(function (k) { return r[k]; }).map(function (k) {
            return '<div class="record-body"><b>' + F[k] + '：</b>' + esc(r[k]) + '</div>';
          }).join('') + '</div>';
      }).join('');
      box.querySelectorAll('[data-del]').forEach(function (b) {
        b.onclick = function () { var l2 = records(); l2.splice(+b.dataset.del, 1); Store.save('thought', l2); render(); toast('已删除'); };
      });
      box.querySelectorAll('[data-load]').forEach(function (b) {
        b.onclick = function () {
          var r = records()[+b.dataset.load];
          Object.keys(F).forEach(function (k) { document.getElementById(k).value = r[k] || ''; });
          bel.value = r.belief; bel2.value = r.belief2; md2.value = r.mood2;
          document.getElementById('tBeliefV').textContent = r.belief;
          document.getElementById('tBelief2V').textContent = r.belief2;
          document.getElementById('tMood2V').textContent = r.mood2;
          window.scrollTo({ top: 0, behavior: 'smooth' });
          toast('已载入到表单');
        };
      });
    }
    document.getElementById('tSave').onclick = function () {
      var r = gather();
      if (!r.t2 && !r.t5) return toast('至少填写"自动想法"这一栏');
      var l = records(); l.push(r); Store.save('thought', l); render(); toast('已保存');
    };
    document.getElementById('tClearForm').onclick = function () {
      Object.keys(F).forEach(function (k) { document.getElementById(k).value = ''; });
      toast('表单已清空');
    };
    document.getElementById('tPrintOne').onclick = function () {
      var r = gather();
      printHtml('<h1>想法记录表</h1><p>日期：' + esc(r.date) + '</p>' +
        '<table border="1" cellpadding="8" style="border-collapse:collapse;width:100%">' +
        '<tr><th style="width:26%">情境</th><td>' + esc(r.t1) + '</td></tr>' +
        '<tr><th>自动想法（相信程度 ' + r.belief + '%）</th><td>' + esc(r.t2) + '</td></tr>' +
        '<tr><th>感受</th><td>' + esc(r.t3) + '</td></tr>' +
        '<tr><th>支持证据</th><td>' + esc(r.t4a) + '</td></tr>' +
        '<tr><th>反对证据</th><td>' + esc(r.t4b) + '</td></tr>' +
        '<tr><th>更准确的想法（相信程度 ' + r.belief2 + '%）</th><td>' + esc(r.t5) + '</td></tr>' +
        '<tr><th>现在的难受程度</th><td>' + r.mood2 + '%</td></tr></table>');
    };
    document.getElementById('tPrintBlank').onclick = function () {
      var rows = [['1. 发生了什么（只写事实）', 3], ['2. 脑子里第一句话（有多相信 ___ %）', 3], ['3. 感受与程度', 2],
      ['4a. 支持的证据', 3], ['4b. 反对的证据', 3], ['5. 更准确的想法（相信程度 ___ %）', 4]];
      printHtml('<h1>想法记录表（空白）</h1><p>用法：当一件事反复在脑子里转的时候，按顺序填写，像律师一样为双方找证据。</p>' +
        '<table border="1" cellpadding="8" style="border-collapse:collapse;width:100%">' +
        '<tr><th style="width:28%">日期 / 星期</th><td></td></tr>' +
        rows.map(function (r) {
          return '<tr><th>' + r[0] + '</th><td style="height:' + (r[1] * 26) + 'px"></td></tr>';
        }).join('') + '</table>' +
        '<p>最后问自己：现在的相信程度变成多少？难受程度变成多少？</p>');
    };
    document.getElementById('tExport').onclick = function () {
      var l = records();
      if (!l.length) return toast('还没有记录');
      download('想法记录.json', JSON.stringify(l, null, 2), 'application/json');
      toast('已导出');
    };
    document.getElementById('tClearAll').onclick = function () {
      if (confirm('确定清空全部想法记录吗？')) { Store.del('thought'); render(); toast('已清空'); }
    };
    render();
  };

  /* ---------- 5. 番茄钟 ---------- */
  INIT.pomodoro = function () {
    var disp = document.getElementById('pDisplay');
    if (!disp) return;
    var workEl = document.getElementById('pWork'), breakEl = document.getElementById('pBreak');
    var bar = document.getElementById('pBar'), phaseEl = document.getElementById('pPhase'), doneEl = document.getElementById('pDone');
    var state = Store.load('pomo', { done: 0, date: localDate() });
    if (state.date !== localDate()) { state = { done: 0, date: localDate() }; }

    function tasks() { return Store.load('ptasks', []); }

    var mode = 'work', left = (+workEl.value) * 60, total = left, timer = null, running = false;

    function fmt(s) {
      var m = Math.floor(s / 60), x = s % 60;
      return (m < 10 ? '0' + m : m) + ':' + (x < 10 ? '0' + x : x);
    }
    function paint() {
      disp.textContent = fmt(Math.max(0, left));
      disp.className = 'timer-display' + (mode === 'break' ? ' break' : '');
      bar.style.width = (total ? ((total - left) / total) * 100 : 0) + '%';
      phaseEl.innerHTML = (mode === 'work' ? '专注阶段' : '休息阶段') + ' · 今日已完成 <b id="pDone">' + state.done + '</b> 个番茄';
      document.title = (running ? fmt(left) + ' · ' : '') + '心桥 · 高中生成长指南';
    }
    function next() {
      if (mode === 'work') {
        state.done++; Store.save('pomo', state);
        mode = 'break'; total = left = (+breakEl.value) * 60;
        toast('专注完成，去休息 ' + breakEl.value + ' 分钟');
      } else {
        mode = 'work'; total = left = (+workEl.value) * 60;
        toast('休息结束，开始下一个番茄');
      }
      paint();
    }
    function tick() {
      left--;
      if (left <= 0) { next(); return; }
      paint();
    }
    document.getElementById('pStart').onclick = function () {
      if (running) return;
      if (left <= 0) { total = left = (mode === 'work' ? +workEl.value : +breakEl.value) * 60; }
      running = true; timer = setInterval(tick, 1000); paint();
    };
    document.getElementById('pPause').onclick = function () {
      running = false; clearInterval(timer); timer = null; paint(); toast('已暂停');
    };
    document.getElementById('pReset').onclick = function () {
      running = false; clearInterval(timer); timer = null;
      mode = 'work'; total = left = (+workEl.value) * 60; paint();
    };
    workEl.onchange = breakEl.onchange = function () {
      if (!running) { total = left = (+(mode === 'work' ? workEl : breakEl).value) * 60; paint(); }
    };
    document.getElementById('pPresets').addEventListener('click', function (e) {
      var b = e.target.closest('[data-work]');
      if (!b) return;
      workEl.value = b.dataset.work; breakEl.value = b.dataset.break;
      running = false; clearInterval(timer); timer = null;
      mode = 'work'; total = left = (+workEl.value) * 60; paint(); toast('已切换为 ' + b.dataset.work + ' / ' + b.dataset.break);
    });

    function renderTasks() {
      var box = document.getElementById('pTasks'), list = tasks();
      if (!list.length) { box.innerHTML = '<div class="empty">还没有任务。先写一件最小的事。</div>'; return; }
      box.innerHTML = list.map(function (t, i) {
        return '<div class="task-item' + (t.done ? ' done' : '') + '">' +
          '<input type="checkbox" data-tdone="' + i + '"' + (t.done ? ' checked' : '') + '>' +
          '<span class="t">' + esc(t.text) + '</span>' +
          (t.poms ? '<span class="poms">' + t.poms + ' 个</span>' : '') +
          '<button class="btn btn-sm btn-ghost" data-tpom="' + i + '" title="记一个番茄">＋1</button>' +
          '<button class="btn btn-sm btn-danger" data-tdel="' + i + '">删除</button></div>';
      }).join('');
      box.querySelectorAll('[data-tdone]').forEach(function (c) {
        c.onchange = function () { var l = tasks(); l[+c.dataset.tdone].done = c.checked; Store.save('ptasks', l); renderTasks(); };
      });
      box.querySelectorAll('[data-tpom]').forEach(function (b) {
        b.onclick = function () { var l = tasks(); l[+b.dataset.tpom].poms = (l[+b.dataset.tpom].poms || 0) + 1; Store.save('ptasks', l); renderTasks(); };
      });
      box.querySelectorAll('[data-tdel]').forEach(function (b) {
        b.onclick = function () { var l = tasks(); l.splice(+b.dataset.tdel, 1); Store.save('ptasks', l); renderTasks(); };
      });
    }
    document.getElementById('pTaskAdd').onclick = function () {
      var inp = document.getElementById('pTaskInput');
      var v = inp.value.trim();
      if (!v) return;
      var l = tasks(); l.push({ text: v, done: false, poms: 0 }); Store.save('ptasks', l);
      inp.value = ''; renderTasks();
    };
    document.getElementById('pTaskInput').onkeydown = function (e) {
      if (e.key === 'Enter') document.getElementById('pTaskAdd').click();
    };
    document.getElementById('pTaskClear').onclick = function () {
      Store.save('ptasks', tasks().filter(function (t) { return !t.done; })); renderTasks(); toast('已清理完成的任务');
    };
    paint(); renderTasks();
  };

  /* ---------- 6. 目标计划生成器 ---------- */
  INIT.planner = function () {
    var out = document.getElementById('gOut');
    if (!out) return;
    var ids = ['gGoal', 'gMeasure', 'gWhen', 'gWhy', 'gTrigger', 'gAction', 'gFallback'];
    function v(id) { return document.getElementById(id).value.trim(); }
    function gen() {
      var o = {};
      ids.forEach(function (i) { o[i] = v(i); });
      if (!o.gGoal) return toast('先写一个目标吧');
      var goal = o.gGoal.replace(/[。.]$/, '');
      var lines = [];
      lines.push('【我的 SMART 目标】');
      lines.push('到 ' + (o.gWhen || '（填上截止时间）') + '，我要' + goal +
        (o.gMeasure ? '，衡量标准是：' + o.gMeasure.replace(/^，/, '') : '') + '。');
      if (o.gWhy) lines.push('我选择做这件事，是因为：' + o.gWhy);
      lines.push('');
      lines.push('【如果—那么计划】');
      lines.push('如果' + (o.gTrigger || '（填上具体的时间 / 地点 / 情境）') + '，那么我就' +
        (o.gAction || '（填上小到能立刻开始的动作）') + '。');
      if (o.gFallback) lines.push('如果实在做不到，那么我至少' + o.gFallback + '。');
      lines.push('');
      lines.push('【本周三件事】');
      lines.push('1. ');
      lines.push('2. ');
      lines.push('3. ');
      lines.push('');
      lines.push('【提醒自己】');
      lines.push('· 只看今天能做的第一步，不评价整个人。');
      lines.push('· 中断一天没事，不要连着断两天。');
      lines.push('· 每完成一个番茄就打个勾。');
      var text = lines.join('\n');
      out.innerHTML = '<div class="result-box"><pre style="white-space:pre-wrap;margin:0;font-family:inherit;font-size:.94rem">' +
        esc(text) + '</pre></div>';
      out.dataset.text = text;
    }
    document.getElementById('gGen').onclick = gen;
    document.getElementById('gFill').onclick = function () {
      var demo = {
        gGoal: '把数学成绩提上去', gMeasure: '下次月考数学达到 105 分', gWhen: '5 月 20 日的月考',
        gWhy: '想读的专业对数学有要求，而且我不想一直躲着它',
        gTrigger: '每天晚自习铃响、坐到座位上', gAction: '先做 3 道函数或导数的错题',
        gFallback: '读一遍错题本的解题思路'
      };
      Object.keys(demo).forEach(function (k) { document.getElementById(k).value = demo[k]; });
      gen();
    };
    document.getElementById('gCopy').onclick = function () {
      if (!out.dataset.text) return toast('先生成计划');
      copyText(out.dataset.text);
    };
    document.getElementById('gPrint').onclick = function () {
      if (!out.dataset.text) return toast('先生成计划');
      printHtml('<h1>我的目标与计划</h1><pre style="white-space:pre-wrap;font-family:inherit;font-size:14px">' +
        esc(out.dataset.text) + '</pre>');
    };
  };

  /* ---------- 7. 四象限 ---------- */
  INIT.matrix = function () {
    if (!document.querySelector('[data-q]')) return;
    var saved = Store.load('matrix', {});
    document.querySelectorAll('[data-q]').forEach(function (t) {
      t.value = saved[t.dataset.q] || '';
    });
    document.getElementById('mxSave').onclick = function () {
      var o = {};
      document.querySelectorAll('[data-q]').forEach(function (t) { o[t.dataset.q] = t.value; });
      Store.save('matrix', o); toast('已保存');
    };
    document.getElementById('mxClear').onclick = function () {
      document.querySelectorAll('[data-q]').forEach(function (t) { t.value = ''; });
      Store.save('matrix', {}); toast('已清空');
    };
    document.getElementById('mxPrint').onclick = function () {
      var rows = [
        ['① 重要 & 紧急（马上做）', document.querySelector('[data-q="q1"]').value],
        ['② 重要 & 不紧急（计划做）', document.querySelector('[data-q="q2"]').value],
        ['③ 紧急 & 不重要（快速处理）', document.querySelector('[data-q="q3"]').value],
        ['④ 不重要 & 不紧急（尽量删掉）', document.querySelector('[data-q="q4"]').value]
      ];
      printHtml('<h1>时间四象限</h1><table border="1" cellpadding="8" style="border-collapse:collapse;width:100%">' +
        rows.map(function (r) {
          return '<tr><th style="width:32%;vertical-align:top">' + r[0] + '</th><td style="height:120px;vertical-align:top;white-space:pre-wrap">' +
            esc(r[1]) + '</td></tr>';
        }).join('') + '</table>');
    };
  };

  /* ---------- 8. 每周复盘 ---------- */
  INIT.review = function () {
    if (!document.querySelector('[data-r]')) return;
    function gather() {
      var o = { week: document.getElementById('rvWeek').value, date: localDate(), f: {} };
      document.querySelectorAll('[data-r]').forEach(function (t) { o.f[t.dataset.r] = t.value; });
      return o;
    }
    function fill(o) {
      document.getElementById('rvWeek').value = o.week || '';
      document.querySelectorAll('[data-r]').forEach(function (t) { t.value = (o.f || {})[t.dataset.r] || ''; });
    }
    var last = Store.load('review', null);
    if (last) fill(last);
    document.getElementById('rvSave').onclick = function () {
      Store.save('review', gather()); toast('已保存（下次打开会自动载入）');
    };
    document.getElementById('rvLoad').onclick = function () {
      var l = Store.load('review', null);
      if (!l) return toast('还没有保存过');
      fill(l); toast('已载入上次的复盘');
    };
    function tableHtml(o) {
      var labels = {
        r1: '做对了什么（有效的方法）', r2: '花了时间但没效果的事', r3: '最大的知识漏洞',
        r4: '下周要改变的一件具体的事', r5: '睡眠 / 精神状态 / 身体', r6: '让我开心或感激的小事'
      };
      return '<h1>每周复盘</h1><p>周次：' + esc(o.week || '____________') + '　日期：' + esc(o.date || '') + '</p>' +
        '<table border="1" cellpadding="8" style="border-collapse:collapse;width:100%">' +
        Object.keys(labels).map(function (k) {
          return '<tr><th style="width:32%;vertical-align:top">' + labels[k] +
            '</th><td style="height:80px;vertical-align:top;white-space:pre-wrap">' + esc((o.f || {})[k] || '') + '</td></tr>';
        }).join('') + '</table>';
    }
    document.getElementById('rvPrint').onclick = function () { printHtml(tableHtml(gather())); };
    document.getElementById('rvPrintBlank').onclick = function () { printHtml(tableHtml({ week: '', f: {} })); };
  };

  /* ---------- 9. 考后复盘 ---------- */
  INIT.examreview = function () {
    var tbody = document.querySelector('#erTable tbody');
    if (!tbody) return;
    var TYPES = ['概念不清', '审题失误', '计算错误', '方法不会', '时间不够', '状态影响'];
    function addRow(data) {
      data = data || {};
      var tr = document.createElement('tr');
      tr.innerHTML = '<td><input type="text" data-f="subject" value="' + esc(data.subject || '') + '" placeholder="数学"></td>' +
        '<td><input type="text" data-f="score" value="' + esc(data.score || '') + '" placeholder="92 / 150"></td>' +
        TYPES.map(function (t, i) {
          return '<td><input type="number" min="0" data-f="t' + i + '" value="' + esc((data['t' + i]) || '') + '" placeholder="0"></td>';
        }).join('') +
        '<td><button class="btn btn-sm btn-danger" data-erDel>删除</button></td>';
      tbody.appendChild(tr);
      tr.querySelector('[data-erDel]').onclick = function () { tr.remove(); };
    }
    function collect() {
      return Array.prototype.map.call(tbody.querySelectorAll('tr'), function (tr) {
        var o = {};
        tr.querySelectorAll('[data-f]').forEach(function (i) { o[i.dataset.f] = i.value; });
        return o;
      });
    }
    function rowsFromSaved() {
      var s = Store.load('examreview', null);
      if (!s || !s.rows) return false;
      tbody.innerHTML = '';
      document.getElementById('erName').value = s.name || '';
      document.getElementById('erDate').value = s.date || localDate();
      s.rows.forEach(addRow); return true;
    }
    if (!rowsFromSaved()) { addRow(); addRow(); addRow(); }

    document.getElementById('erAddRow').onclick = function () { addRow(); };
    document.getElementById('erSave').onclick = function () {
      Store.save('examreview', { name: document.getElementById('erName').value, date: document.getElementById('erDate').value, rows: collect() });
      toast('已保存');
    };
    document.getElementById('erLoad').onclick = function () {
      if (!rowsFromSaved()) toast('还没有保存过');
      else toast('已载入上次的记录');
    };
    document.getElementById('erCalc').onclick = function () {
      var rows = collect().filter(function (r) { return r.subject; });
      if (!rows.length) return toast('至少填一个科目');
      var totals = TYPES.map(function () { return 0; }), sum = 0;
      rows.forEach(function (r) {
        TYPES.forEach(function (t, i) { var n = +r['t' + i] || 0; totals[i] += n; sum += n; });
      });
      if (!sum) return toast('请填写各类型的失分分值');
      var max = Math.max.apply(null, totals);
      var worst = TYPES[totals.indexOf(max)];
      var sorted = TYPES.map(function (t, i) { return { t: t, n: totals[i] }; })
        .sort(function (a, b) { return b.n - a.n; });
      var advice = {
        '概念不清': '重读课本与笔记，用「费曼技巧」把这一章讲给同学听；合上书默写框架。',
        '审题失误': '做题时圈出关键词与限定条件，读完题先用自己的话复述一遍要求。',
        '计算错误': '把计算过程写全，不跳步；每天做 10 道纯计算题练手速与准确率。',
        '方法不会': '按题型整理"这一类题怎么做"的步骤卡，每类做 3 道相似题。',
        '时间不够': '平时就限时训练；考试时给每部分设时间上限，卡题 90 秒就跳过。',
        '状态影响': '考前写下担忧清单；考中用呼吸法稳住；把"必须考好"改成"把会的做对"。'
      };
      document.getElementById('erOut').innerHTML = '<div class="result-box">' +
        '<div class="result-score">' + sum + ' 分</div>' +
        '<p class="small muted">共统计到 ' + sum + ' 分的失分。</p>' +
        '<div class="table-wrap"><table><thead><tr><th>失分类型</th><th>分值</th><th>占比</th></tr></thead><tbody>' +
        sorted.map(function (s) {
          return '<tr><td>' + s.t + '</td><td>' + s.n + '</td><td>' + Math.round(s.n / sum * 100) + '%</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<p><strong>最该先补的洞：' + worst + '（' + max + ' 分）</strong></p>' +
        '<p>' + advice[worst] + '</p>' +
        '<p class="tiny muted">提醒：把"我没考好"变成"我在 X 类问题上丢了 Y 分"，情绪就变成了信息。一次考试的失分结构，比总分更有价值。</p>' +
        '</div>';
    };
    document.getElementById('erPrint').onclick = function () {
      var rows = collect();
      printHtml('<h1>考后复盘表</h1><p>考试：' + esc(document.getElementById('erName').value) +
        '　日期：' + esc(document.getElementById('erDate').value) + '</p>' +
        '<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:12px">' +
        '<tr><th>科目</th><th>得分 / 满分</th>' + TYPES.map(function (t) { return '<th>' + t + '</th>'; }).join('') + '</tr>' +
        rows.map(function (r) {
          return '<tr><td>' + esc(r.subject) + '</td><td>' + esc(r.score) + '</td>' +
            TYPES.map(function (t, i) { return '<td>' + esc(r['t' + i] || '') + '</td>'; }).join('') + '</tr>';
        }).join('') + '</table>');
    };
  };

  window.TOOLS_INIT = INIT;

  /* ======================================================================
     全局数据管理按钮（工具首页）
     ====================================================================== */
  window.initDataManager = function (root) {
    var ex = root.querySelector('#exportAll');
    if (ex) ex.onclick = function () {
      var data = Store.dump();
      if (!Object.keys(data).length) return toast('还没有任何记录');
      download('心桥数据备份.json', JSON.stringify(data, null, 2), 'application/json');
      toast('已导出备份文件');
    };
    var cl = root.querySelector('#clearAll');
    if (cl) cl.onclick = function () {
      if (!confirm('确定清空本站保存的全部记录吗？（状态记录、想法记录、清单勾选、任务清单等）此操作不可恢复。')) return;
      Store.clearAll();
      toast('已清空全部记录');
      setTimeout(function () { location.reload(); }, 700);
    };
  };

  window.copyText = copyText;
  window.download = download;
})();
