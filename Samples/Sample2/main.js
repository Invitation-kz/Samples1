"use strict";

document.addEventListener("DOMContentLoaded", function () {

  /* ==========================================================
     1) Модальное окно "Шақыртуды ашу" + фоновая музыка +
        плавный автоскролл страницы после нажатия
     ========================================================== */
  (function initMusicAndAutoscroll() {
    const SPEED_PX_PER_SEC = 100;   // скорость автоскролла (px/сек)
    const RESTART_DELAY_MS = 5000;  // пауза перед возобновлением после действия юзера

    const modal = document.getElementById("musicModal");
    const playButton = document.getElementById("playMusic");
    const audio = document.getElementById("backgroundMusic");

    document.documentElement.style.scrollBehavior = 'auto';
    document.body.style.scrollBehavior = 'auto';
    document.body.style.overflow = 'hidden'; // блокируем скролл, пока открыт модал

    let isRunning = false;
    let resumeTimer = null;
    let rafId = null;
    let lastTs = 0;
    let accum = 0;

    function safeScrollBy(step) {
      const before = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      window.scrollBy(0, step);
      let after = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

      if (after === before) {
        document.documentElement.scrollTop = before + step;
        after = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        if (after === before) {
          document.body.scrollTop = before + step;
        }
      }
    }

    function atBottom() {
      const maxScroll = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
      const y = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      return y >= maxScroll - 1;
    }

    function loop(ts) {
      rafId = requestAnimationFrame(loop);
      if (!isRunning) { lastTs = ts; return; }
      if (!lastTs) lastTs = ts;

      const dt = ts - lastTs;
      lastTs = ts;
      accum += (SPEED_PX_PER_SEC * dt) / 1000;

      const step = Math.floor(accum);
      if (step >= 1) {
        accum -= step;
        if (atBottom()) {
          stopAuto();
          cancelAnimationFrame(rafId);
          rafId = null;
          return;
        }
        safeScrollBy(step);
      }
    }

    function startAuto() { if (!isRunning) { isRunning = true; } }
    function stopAuto() { isRunning = false; }
    function restartAfterDelay() {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => startAuto(), RESTART_DELAY_MS);
    }

    const onInteract = () => { stopAuto(); restartAfterDelay(); };
    window.addEventListener('touchstart', onInteract, { passive: true });
    window.addEventListener('touchmove', onInteract, { passive: true });
    window.addEventListener('wheel', onInteract, { passive: true });
    window.addEventListener('mousedown', onInteract, { passive: true });
    window.addEventListener('keydown', onInteract, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { stopAuto(); }
      else { restartAfterDelay(); }
    });

    function closeModal() {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }

    playButton.addEventListener('click', () => {
      audio.play().catch(() => {});
      closeModal();
      if (!rafId) rafId = requestAnimationFrame(loop);
      restartAfterDelay();
    });
  })();

  /* ==========================================================
     2) Плавное появление блока #content (.fade-in)
     ========================================================== */
  (function initFadeIn() {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    });

    document.querySelectorAll(".fade-in").forEach(function (el) {
      observer.observe(el);
    });
  })();

  /* ==========================================================
     3) Появление блоков .element-animation при скролле
     ========================================================== */
  (function initElementAnimation() {
    function onEntry(entries) {
      entries.forEach(change => {
        if (change.isIntersecting) {
          change.target.classList.add('element-show');
        }
      });
    }
    const observer = new IntersectionObserver(onEntry, { threshold: [0.5] });
    document.querySelectorAll('.element-animation').forEach(el => observer.observe(el));
  })();

  /* ==========================================================
     4) Форма RSVP: счётчик гостей + отправка в Google Apps Script
     ========================================================== */
  (function initForm() {
    const URL_APP = "https://script.google.com/macros/s/AKfycbwnW5vDcH_2PUrc6gsiTVv44t-KF1e_a7GBgLUETdnl-vN61ox9S7GNNw6M-OBDjfJB4w/exec";

    const form = document.querySelector("#form");
    form.action = URL_APP;

    const decreaseBtn = document.querySelector("#decrease");
    const increaseBtn = document.querySelector("#increase");
    const countDisplay = document.querySelector("#peopleCount");
    const hiddenChoice = document.querySelector("#choice");

    let count = 1;

    decreaseBtn.addEventListener("click", () => {
      if (count > 1) {
        count--;
        countDisplay.textContent = count;
        hiddenChoice.value = count;
      }
    });

    increaseBtn.addEventListener("click", () => {
      count++;
      countDisplay.textContent = count;
      hiddenChoice.value = count;
    });

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();

      const name = document.querySelector("[name=name]:checked");
      const choice = document.querySelector("[name=choice]");
      const message = document.querySelector("[name=message]");

      const details = {
        name: name ? name.value : '',
        choice: choice ? choice.value : '',
        message: message.value.trim(),
      };

      let formBody = [];
      for (const property in details) {
        formBody.push(encodeURIComponent(property) + "=" + encodeURIComponent(details[property]));
      }
      formBody = formBody.join("&");

      // Очистка формы
      if (name) name.checked = false;
      count = 1;
      countDisplay.textContent = count;
      hiddenChoice.value = count;
      message.value = '';

      alert('Жауабыңызға рахмет!');

      fetch(URL_APP, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        mode: "no-cors",
        body: formBody,
      }).catch((err) => {
        console.error('Error:', err);
        alert("Қате орын алды!");
      });
    });
  })();

  /* ==========================================================
     5) Обратный отсчёт до даты свадьбы
     ========================================================== */
  (function initCountdown() {
    function updateCountdown() {
      const endDate = new Date("September 24, 2026 18:00:00").getTime();
      const now = new Date().getTime();
      const distance = endDate - now;

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      document.getElementById("days").innerText = days;
      document.getElementById("hours").innerText = hours;
      document.getElementById("minutes").innerText = minutes;
      document.getElementById("seconds").innerText = seconds;

      if (distance < 0) {
        clearInterval(timerInterval);
        document.getElementById("days").innerText = "00";
        document.getElementById("hours").innerText = "00";
        document.getElementById("minutes").innerText = "00";
        document.getElementById("seconds").innerText = "00";
      }
    }

    const timerInterval = setInterval(updateCountdown, 1000);
    updateCountdown();
  })();

  /* ==========================================================
     6) Запуск эффекта лепестков сакуры (см. sakura.js)
     ========================================================== */
  (function initSakura() {
    new Sakura('body', {
      colors: [
        { gradientColorStart: 'rgba(130, 158, 100, 0.9)', gradientColorEnd: 'rgba(225, 207, 155, 0.9)', gradientColorDegree: 120 },
        { gradientColorStart: 'rgba(44, 0)', gradientColorEnd: 'rgba(44, 0)', gradientColorDegree: 120 },
        { gradientColorStart: 'rgba(44, 0)', gradientColorEnd: 'rgba(44, 0)', gradientColorDegree: 120 },
      ],
      delay: 50,
    });
  })();

});
