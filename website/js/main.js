// TMA marketing site — shared behaviour (mobile nav, active link, scroll reveal)
(function () {
  "use strict";

  // Mobile nav toggle
  var nav = document.querySelector(".nav");
  var toggle = document.querySelector(".nav-toggle");
  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
      var expanded = nav.classList.contains("open");
      toggle.setAttribute("aria-expanded", String(expanded));
    });

    nav.querySelectorAll(".nav-links a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Footer year
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  // Highlight the current page in the nav
  var currentPath = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach(function (link) {
    var href = link.getAttribute("href");
    if (href === currentPath || (currentPath === "" && href === "index.html")) {
      link.setAttribute("aria-current", "page");
    }
  });

  // Reveal-on-scroll
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("visible");
    });
  }
})();

// ============================================================
// TMA marketing site — chat support widget
// ============================================================
(function () {
  "use strict";

  var CONTACT_HREF = "about.html#contact";
  var EMAIL = "hello@yourdomain.com";

  var FAQS = [
    {
      keywords: ["what is tma", "what's tma", "total mill analyzer", "what does tma do", "about tma", "what is this"],
      reply:
        "TMA — the Total Mill Analyzer — is an AI-powered, machine-vision grain quality platform for rice mills. It grades paddy at procurement, watches quality on every machine through production, and verifies the finished milled rice, sample by sample, with reports and analytics behind every decision."
    },
    {
      keywords: ["procurement", "paddy", "incoming", "purchase", "buy"],
      reply:
        'Procurement Analysis grades incoming paddy the moment it arrives — accepted / rejected / foreign-matter percentages, grain dimensions, variety and season — so purchasing decisions are based on measured quality, not a visual guess. <a href="procurement-analysis.html">See Procurement Analysis →</a>'
    },
    {
      keywords: ["production", "machine wise", "series", "mill line", "husker", "whitener", "polisher", "sorter", "grader", "sifter", "tray separator", "thickness"],
      reply:
        'Production Analysis tracks quality machine-by-machine and series-by-series across your mill line — husker, whitener, polisher, thickness &amp; length graders, sifter, colour sorter and blend &amp; pack — live, batch after batch. <a href="production-analysis.html">See Production Analysis →</a>'
    },
    {
      keywords: ["milled rice", "finished rice", "finished product", "basmati", "dispatch", "bagging", "pack"],
      reply:
        'Milled Rice Analysis verifies the finished product before it ships — Basmati and Non-Basmati grading, grain dimensions and whiteness, batch after batch. <a href="milled-rice-analysis.html">See Milled Rice Analysis →</a>'
    },
    {
      keywords: ["report", "analytic", "trend", "chart", "dashboard", "data", "predictive", "cooking", "nutrition"],
      reply:
        'Reports &amp; Analytics ties every sample from all three stages into one filterable history — trend charts, control charts, machine/series comparisons and predictive quality analytics. <a href="reports-analytics.html">See Reports &amp; Analytics →</a>'
    },
    {
      keywords: ["language", "hindi", "kannada", "tamil", "telugu", "malayalam", "voice", "operator"],
      reply:
        "Every TMA workflow step can be narrated aloud in English, Hindi, Kannada, Tamil, Telugu or Malayalam — so any operator on the mill floor can run a full analysis without needing to read English."
    },
    {
      keywords: ["who is it for", "who can use", "who benefit", "customer", "miller", "exporter", "laboratory", "government"],
      reply:
        "TMA is built for rice millers, exporters, quality laboratories, and government &amp; institutional agencies — anywhere an objective, repeatable grain quality standard matters."
    },
    {
      keywords: ["price", "pricing", "cost", "how much", "quote"],
      reply:
        "Pricing depends on your mill's setup and scale. The fastest way to get a clear quote is a short demo, where we walk through your line first."
    },
    {
      keywords: ["demo", "trial", "try it", "see it in action"],
      reply: 'Happy to set one up — request a demo and our team will reach out to schedule it. <a href="' + CONTACT_HREF + '">Request a Demo →</a>'
    },
    {
      keywords: ["contact", "email", "phone", "human", "talk to someone", "support", "reach you"],
      reply:
        'You can reach our team directly at <a href="mailto:' + EMAIL + '">' + EMAIL + "</a>, or use the Request a Demo button below and we'll get back to you."
    },
    {
      keywords: ["hi", "hello", "hey", "good morning", "good afternoon"],
      reply: "Hello! I'm the TMA assistant. Ask me about Procurement, Production, Milled Rice Analysis, Reports &amp; Analytics, or how to get in touch with the team."
    },
    {
      keywords: ["thank", "thanks"],
      reply: "You're welcome! Let me know if there's anything else about TMA I can help with."
    }
  ];

  var FALLBACK_REPLY =
    "I don't have a ready answer for that yet, but our team can help directly. Want to email us or request a demo?";

  function findReply(text) {
    var lower = text.toLowerCase();
    for (var i = 0; i < FAQS.length; i++) {
      var faq = FAQS[i];
      for (var j = 0; j < faq.keywords.length; j++) {
        if (lower.indexOf(faq.keywords[j]) !== -1) {
          return faq.reply;
        }
      }
    }
    return null;
  }

  var QUICK_REPLIES = ["What is TMA?", "How does it work?", "Who is TMA for?", "Talk to our team"];

  var QUICK_REPLY_OVERRIDES = {
    "how does it work?":
      "TMA images every grain with high-resolution cameras under controlled lighting, then an AI/ML model classifies each one in real time — head rice, broken, chalky, discoloured and more — and reports the result digitally in minutes.",
    "talk to our team": 'You can reach us at <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>, or <a href="' + CONTACT_HREF + '">request a demo</a> and we\'ll follow up.'
  };

  function buildWidget() {
    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="chat-launcher-bubble hidden" id="chatBubble">Questions about TMA? Chat with us 👋</div>' +
      '<button type="button" class="chat-launcher" id="chatLauncher" aria-expanded="false" aria-controls="chatWidget" aria-label="Open chat support">' +
      '<span class="chat-launcher-badge" id="chatBadge"></span>' +
      '<svg class="chat-launcher-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
      '<svg class="chat-launcher-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      "</button>" +
      '<div class="chat-widget" id="chatWidget" role="dialog" aria-label="TMA chat support" aria-hidden="true">' +
      '<div class="chat-widget-header">' +
      '<div class="chat-widget-avatar"><img src="assets/images/tma-logo.jpeg" alt="" /></div>' +
      '<div class="chat-widget-header-text"><strong>TMA Support</strong><span>Online · replies in a few hours</span></div>' +
      '<button type="button" class="chat-widget-close" id="chatClose" aria-label="Close chat">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      "</button>" +
      "</div>" +
      '<div class="chat-widget-body" id="chatBody" aria-live="polite"></div>' +
      '<div class="chat-widget-actions">' +
      '<a href="' + CONTACT_HREF + '">Request a Demo</a>' +
      '<a href="mailto:' + EMAIL + '">Email Us</a>' +
      "</div>" +
      '<form class="chat-widget-form" id="chatForm">' +
      '<input type="text" id="chatInput" placeholder="Type a message…" autocomplete="off" maxlength="300" aria-label="Type a message" />' +
      '<button type="submit" aria-label="Send message">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>' +
      "</button>" +
      "</form>" +
      "</div>";
    while (wrap.firstChild) {
      document.body.appendChild(wrap.firstChild);
    }
  }

  function addMessage(body, html, who) {
    var msg = document.createElement("div");
    msg.className = "chat-msg chat-msg-" + who;
    msg.innerHTML = html;
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
  }

  function addQuickReplies(body, labels, onPick) {
    var row = document.createElement("div");
    row.className = "chat-quick-replies";
    labels.forEach(function (label) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chat-quick-chip";
      chip.textContent = label;
      chip.addEventListener("click", function () {
        row.remove();
        onPick(label);
      });
      row.appendChild(chip);
    });
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
  }

  function botReply(body, text) {
    var typing = document.createElement("div");
    typing.className = "chat-typing";
    typing.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;

    window.setTimeout(function () {
      typing.remove();
      addMessage(body, text, "bot");
    }, 500 + Math.random() * 400);
  }

  function handleUserText(body, text) {
    addMessage(body, escapeHtml(text), "user");
    var override = QUICK_REPLY_OVERRIDES[text.toLowerCase()];
    var reply = override || findReply(text) || FALLBACK_REPLY;
    botReply(body, reply);
    if (reply === FALLBACK_REPLY) {
      window.setTimeout(function () {
        addQuickReplies(body, ["Request a Demo", "Email Us"], function (label) {
          if (label === "Request a Demo") {
            window.location.href = CONTACT_HREF;
          } else {
            window.location.href = "mailto:" + EMAIL;
          }
        });
      }, 950);
    }
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function initChatWidget() {
    buildWidget();

    var launcher = document.getElementById("chatLauncher");
    var widget = document.getElementById("chatWidget");
    var closeBtn = document.getElementById("chatClose");
    var body = document.getElementById("chatBody");
    var form = document.getElementById("chatForm");
    var input = document.getElementById("chatInput");
    var bubble = document.getElementById("chatBubble");
    var badge = document.getElementById("chatBadge");

    var greeted = false;

    function greet() {
      if (greeted) return;
      greeted = true;
      botReply(
        body,
        "Hi, I'm the TMA assistant. Ask me anything about Procurement, Production or Milled Rice Analysis, Reports &amp; Analytics, or how to reach the team."
      );
      window.setTimeout(function () {
        addQuickReplies(body, QUICK_REPLIES, function (label) {
          handleUserText(body, label);
        });
      }, 950);
    }

    function openWidget() {
      widget.classList.add("open");
      launcher.classList.add("open");
      launcher.setAttribute("aria-expanded", "true");
      widget.setAttribute("aria-hidden", "false");
      bubble.classList.add("hidden");
      badge.classList.add("hidden");
      try {
        sessionStorage.setItem("tmaChatSeen", "1");
      } catch (e) {}
      window.requestAnimationFrame(function () {
        widget.classList.add("visible");
      });
      greet();
      window.setTimeout(function () {
        input.focus();
      }, 260);
    }

    function closeWidget() {
      widget.classList.remove("visible");
      launcher.classList.remove("open");
      launcher.setAttribute("aria-expanded", "false");
      widget.setAttribute("aria-hidden", "true");
      window.setTimeout(function () {
        widget.classList.remove("open");
      }, 200);
      launcher.focus();
    }

    launcher.addEventListener("click", function () {
      if (widget.classList.contains("open")) {
        closeWidget();
      } else {
        openWidget();
      }
    });

    closeBtn.addEventListener("click", closeWidget);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && widget.classList.contains("open")) {
        closeWidget();
      }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      input.value = "";
      handleUserText(body, text);
    });

    // Invite bubble: show once per session, a few seconds after page load
    var seen = false;
    try {
      seen = sessionStorage.getItem("tmaChatSeen") === "1";
    } catch (e) {}

    if (!seen) {
      window.setTimeout(function () {
        if (!widget.classList.contains("open")) {
          bubble.classList.remove("hidden");
        }
      }, 4000);

      window.setTimeout(function () {
        bubble.classList.add("hidden");
      }, 14000);
    } else {
      badge.classList.add("hidden");
    }

    bubble.addEventListener("click", openWidget);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initChatWidget);
  } else {
    initChatWidget();
  }
})();
