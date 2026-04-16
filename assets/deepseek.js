(function () {
  var DEEPSEEK_CHAT = "https://chat.deepseek.com/";

  function buildPrompt(title, pdfAbsUrl) {
    return (
      "【高三数学课堂板书总结请求】\n" +
      "请协助我阅读并总结下面这份课堂板书 PDF。板书多为 iPad 手写导出，若个别字迹难以识别，请基于可读部分归纳，并说明不确定之处。\n\n" +
      "板书名称：" +
      title +
      "\n\n" +
      "该文件在本站的公开访问链接（请优先尝试；若 DeepSeek 无法直接读取链接内容，请你在本机浏览器打开该链接查看 PDF，再将 PDF 上传或分页截图发给我）：\n" +
      pdfAbsUrl +
      "\n\n" +
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

  function handleDeepseekClick(btn) {
    var pdf = btn.getAttribute("data-pdf");
    var title = btn.getAttribute("data-title") || "课堂板书";
    if (!pdf) return;

    var absUrl;
    try {
      absUrl = new URL(pdf, window.location.href).href;
    } catch (e) {
      absUrl = pdf;
    }

    var text = buildPrompt(title, absUrl);

    copyText(text)
      .then(function () {
        openDeepseekTab();
        showToast("已复制提示词与 PDF 链接，请在新标签页的 DeepSeek 输入框中粘贴发送。");
      })
      .catch(function () {
        fallbackCopy(text)
          .then(function () {
            openDeepseekTab();
            showToast("已复制（兼容模式），请在新标签页 DeepSeek 中粘贴。");
          })
          .catch(function () {
            showFallback(text);
          });
      });
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
