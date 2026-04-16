(function () {
  var DEEPSEEK_CHAT = "https://chat.deepseek.com/";

  function fileNameFromPath(pdfPath) {
    var s = String(pdfPath).replace(/^\.\//, "");
    var i = s.lastIndexOf("/");
    return i >= 0 ? s.slice(i + 1) : s;
  }

  /** 触发本讲 PDF 下载（同源页面一般可保存为指定文件名） */
  function triggerDownload(pdfPath) {
    var name = fileNameFromPath(pdfPath);
    var abs;
    try {
      abs = new URL(pdfPath, window.location.href).href;
    } catch (e) {
      abs = pdfPath;
    }
    var a = document.createElement("a");
    a.href = abs;
    a.setAttribute("download", name);
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return name;
  }

  /**
   * 说明：网页无法把本机文件自动塞进 DeepSeek 的上传框（跨站安全限制）。
   * 流程为：先下载 PDF → 用户在 DeepSeek 里手动选「刚下载的该文件名」（通常为下载列表第一项）→ 再粘贴提示词。
   */
  function buildPrompt(title, fileName) {
    return (
      "【高三数学课堂板书总结】\n" +
      "我已在本页触发本讲板书 PDF 的下载。请在 DeepSeek 中点击上传附件，在「下载」文件夹中选择刚保存的文件「" +
      fileName +
      "」（一般为当前最近下载的一项）；上传后再将本条消息一并发送。\n\n" +
      "板书名称：" +
      title +
      "\n\n" +
      "请协助总结该 PDF。板书多为 iPad 手写导出，若个别字迹难以识别，请基于可读部分归纳，并说明不确定之处。\n\n" +
      "请按以下结构输出：\n" +
      "1）本讲涉及的主要知识点与题型；\n" +
      "2）关键步骤、板书层次与书写要点；\n" +
      "3）与高考相关的常见考法或易错点；\n" +
      "4）课后巩固建议（1～3 条，尽量具体）。\n"
    );
  }

  function showToast(message) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    el.classList.remove("toast-visible");
    window.clearTimeout(showToast._t);
    window.clearTimeout(showToast._hide);
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        el.classList.add("toast-visible");
      });
    });
    showToast._t = window.setTimeout(function () {
      el.classList.remove("toast-visible");
      showToast._hide = window.setTimeout(function () {
        el.hidden = true;
      }, 400);
    }, 5200);
  }

  function showFallback(text) {
    var overlay = document.getElementById("deepseek-fallback");
    var ta = document.getElementById("deepseek-fallback-text");
    if (!overlay || !ta) {
      window.prompt("请复制以下内容到 DeepSeek：", text);
      return;
    }
    ta.value = text;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function hideFallback() {
    var overlay = document.getElementById("deepseek-fallback");
    if (!overlay) return;
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  function openDeepseekTab() {
    window.open(DEEPSEEK_CHAT, "_blank", "noopener,noreferrer");
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return Promise.reject(new Error("clipboard unavailable"));
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    } finally {
      document.body.removeChild(ta);
    }
  }

  function runAfterDownload(btn, fileName) {
    var title = btn.getAttribute("data-title") || "课堂板书";
    var text = buildPrompt(title, fileName);

    function finish() {
      openDeepseekTab();
      showToast("已复制提示词并打开 DeepSeek；请先上传刚下载的「" + fileName + "」，再在输入框粘贴发送。");
    }

    copyText(text)
      .then(finish)
      .catch(function () {
        fallbackCopy(text)
          .then(finish)
          .catch(function () {
            showFallback(text);
          });
      });
  }

  function handleDeepseekClick(btn) {
    var pdf = btn.getAttribute("data-pdf");
    if (!pdf) return;

    var fileName = triggerDownload(pdf);

    window.setTimeout(function () {
      runAfterDownload(btn, fileName);
    }, 320);
  }

  function init() {
    document.querySelectorAll(".btn-deepseek").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        handleDeepseekClick(btn);
      });
    });

    var closeBtn = document.getElementById("deepseek-fallback-close");
    var overlay = document.getElementById("deepseek-fallback");
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) hideFallback();
      });
    }
    if (closeBtn) closeBtn.addEventListener("click", hideFallback);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") hideFallback();
    });

    var copyBtn = document.getElementById("deepseek-fallback-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var ta = document.getElementById("deepseek-fallback-text");
        if (!ta) return;
        copyText(ta.value)
          .catch(function () {
            return fallbackCopy(ta.value);
          })
          .then(function () {
            showToast("已复制到剪贴板。");
          })
          .catch(function () {
            ta.focus();
            ta.select();
          });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
