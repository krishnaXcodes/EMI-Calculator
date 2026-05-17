    // ===== GLOBALS =====
    let currentEMI = 0, currentTotal = 0, currentInterest = 0, currentPrincipal = 0;
    let amortizationData = [];
    let compareLoans = [];
    let loanIdCounter = 0;
    let pdfStateTimer = null;

    // ===== UTILITIES =====
    function formatCurrency(n) {
      if (isNaN(n) || !isFinite(n)) return '₹0';
      return '₹' + Math.round(n).toLocaleString('en-IN');
    }

    function formatCurrencyShort(n) {
      if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
      if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + ' L';
      if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
      return '₹' + n;
    }

    // ===== SYNC INPUTS & SLIDERS =====
    function syncInputs(inputId, sliderId) {
      const input = document.getElementById(inputId);
      const slider = document.getElementById(sliderId);

      input.addEventListener('input', () => {
        slider.value = input.value;
        updateSliderTrack(slider);
        calculateEMI();
      });

      slider.addEventListener('input', () => {
        input.value = slider.value;
        updateSliderTrack(slider);
        calculateEMI();
      });

      updateSliderTrack(slider);
    }

    function updateSliderTrack(slider) {
      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);
      const val = parseFloat(slider.value);
      const pct = ((val - min) / (max - min)) * 100;
      slider.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--border) ${pct}%, var(--border) 100%)`;
    }

    syncInputs('loanAmount', 'loanAmountSlider');
    syncInputs('interestRate', 'interestRateSlider');
    syncInputs('tenure', 'tenureSlider');

    // ===== EMI CALCULATION =====
    function calculateEMI() {
      const P = parseFloat(document.getElementById('loanAmount').value) || 0;
      const annualR = parseFloat(document.getElementById('interestRate').value) || 0;
      const N = (parseInt(document.getElementById('tenure').value) || 0) * 12;

      if (P <= 0 || annualR <= 0 || N <= 0) {
        currentEMI = 0; currentTotal = 0; currentInterest = 0; currentPrincipal = P;
        renderResults(); drawPieChart(0, 0); buildAmortization(0, 0, 0, 0);
        return;
      }

      const r = annualR / 12 / 100;
      const emi = P * r * Math.pow(1 + r, N) / (Math.pow(1 + r, N) - 1);

      currentEMI = emi;
      currentTotal = emi * N;
      currentInterest = currentTotal - P;
      currentPrincipal = P;

      renderResults();
      drawPieChart(P, currentInterest);
      buildAmortization(P, r, emi, N);
    }

    function renderResults() {
      document.getElementById('resultEMI').textContent = formatCurrency(currentEMI);
      document.getElementById('resultTotal').textContent = formatCurrency(currentTotal);
      document.getElementById('resultInterest').textContent = formatCurrency(currentInterest);
      const pieSummary = document.getElementById('pieChartSummary');
      if (pieSummary) {
        pieSummary.textContent = `Principal ${formatCurrency(currentPrincipal)}, total interest ${formatCurrency(currentInterest)}.`;
      }
    }

    // ===== PIE / DONUT CHART =====
    function drawPieChart(principal, interest) {
      const canvas = document.getElementById('pieChart');
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const size = 220;

      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = size + 'px';
      canvas.style.height = size + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, size, size);

      const cx = size / 2, cy = size / 2, radius = 90, inner = 55;
      const total = principal + interest;

      if (total <= 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.arc(cx, cy, inner, 0, Math.PI * 2, true);
        ctx.fillStyle = '#E5E0D8';
        ctx.fill();
        return;
      }

      const principalAngle = (principal / total) * Math.PI * 2;
      const startAngle = -Math.PI / 2;

      // Principal slice
      drawArc(ctx, cx, cy, radius, inner, startAngle, startAngle + principalAngle, '#C4622D');
      // Interest slice
      drawArc(ctx, cx, cy, radius, inner, startAngle + principalAngle, startAngle + Math.PI * 2, '#1A1612');

      // Center text
      ctx.fillStyle = var_ink();
      ctx.font = '600 11px DM Sans';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#5A554E';
      ctx.fillText('PRINCIPAL', cx, cy - 10);
      ctx.font = '700 14px DM Sans';
      ctx.fillStyle = '#1A1612';
      ctx.fillText(((principal / total) * 100).toFixed(1) + '%', cx, cy + 10);
    }

    function drawArc(ctx, cx, cy, outer, inner, start, end, color) {
      ctx.beginPath();
      ctx.arc(cx, cy, outer, start, end);
      ctx.arc(cx, cy, inner, end, start, true);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    function var_ink() { return '#1A1612'; }

    // ===== AMORTIZATION =====
    function buildAmortization(P, r, emi, N) {
      amortizationData = [];
      const tbody = document.getElementById('amortBody');
      tbody.textContent = '';

      if (N <= 0 || emi <= 0) return;

      let balance = P;
      const frag = document.createDocumentFragment();

      for (let m = 1; m <= N; m++) {
        const intPart = balance * r;
        const prinPart = emi - intPart;
        balance = Math.max(balance - prinPart, 0);

        amortizationData.push({
          month: m,
          emi: emi,
          principal: prinPart,
          interest: intPart,
          balance: balance
        });

        const tr = document.createElement('tr');
        const values = [
          String(m),
          formatCurrency(emi),
          formatCurrency(prinPart),
          formatCurrency(intPart),
          formatCurrency(balance)
        ];

        values.forEach(value => {
          const td = document.createElement('td');
          td.textContent = value;
          tr.appendChild(td);
        });

        frag.appendChild(tr);
      }

      tbody.appendChild(frag);
    }

    function toggleAmortization() {
      const wrapper = document.getElementById('amortWrapper');
      const toggle = document.getElementById('amortToggle');
      const isOpen = wrapper.classList.toggle('open');
      toggle.classList.toggle('open', isOpen);
      toggle.querySelector('span:first-child').textContent = isOpen ? 'Hide Schedule' : 'Show Schedule';
    }

    // ===== COMPARE LOANS =====
    function addLoan() {
      if (compareLoans.length >= 4) return;

      const id = ++loanIdCounter;
      compareLoans.push({ id, amount: 1000000, rate: 8.5, tenure: 20 });
      renderCompareGrid();
      updateCompareResults();
    }

    function removeLoan(id) {
      compareLoans = compareLoans.filter(l => l.id !== id);
      renderCompareGrid();
      updateCompareResults();
    }

    function clearAllLoans() {
      compareLoans = [];
      renderCompareGrid();
      updateCompareResults();
    }

    function bindStaticEvents() {
      const amortToggleBtn = document.getElementById('amortToggle');
      const downloadPdfBtn = document.getElementById('downloadPdfBtn');
      const addLoanBtn = document.getElementById('addLoanBtn');
      const clearLoansBtn = document.getElementById('clearLoansBtn');
      const downloadComparisonPdfBtn = document.getElementById('downloadComparisonPdfBtn');

      if (amortToggleBtn) amortToggleBtn.addEventListener('click', toggleAmortization);
      if (downloadPdfBtn) downloadPdfBtn.addEventListener('click', downloadPDF);
      if (addLoanBtn) addLoanBtn.addEventListener('click', addLoan);
      if (clearLoansBtn) clearLoansBtn.addEventListener('click', clearAllLoans);
      if (downloadComparisonPdfBtn) downloadComparisonPdfBtn.addEventListener('click', downloadComparisonPDF);
    }

    function isPdfEngineReady() {
      return !!(
        window.jspdf &&
        window.jspdf.jsPDF &&
        window.jspdf.jsPDF.API &&
        typeof window.jspdf.jsPDF.API.autoTable === 'function'
      );
    }

    function setPdfButtonsLoadingState(isReady) {
      const buttonIds = ['downloadPdfBtn', 'downloadComparisonPdfBtn'];
      buttonIds.forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;

        if (!btn.dataset.readyLabel) {
          btn.dataset.readyLabel = btn.textContent.trim();
        }

        if (isReady) {
          btn.disabled = false;
          btn.classList.remove('is-loading');
          btn.textContent = btn.dataset.readyLabel;
        } else {
          btn.disabled = true;
          btn.classList.add('is-loading');
          btn.textContent = 'Loading PDF engine...';
        }
      });
    }

    function initPdfButtonState() {
      setPdfButtonsLoadingState(isPdfEngineReady());

      if (pdfStateTimer) {
        clearInterval(pdfStateTimer);
        pdfStateTimer = null;
      }

      if (isPdfEngineReady()) return;

      let attempts = 0;
      const maxAttempts = 80;
      pdfStateTimer = setInterval(() => {
        attempts += 1;
        const ready = isPdfEngineReady();
        setPdfButtonsLoadingState(ready);
        if (ready || attempts >= maxAttempts) {
          clearInterval(pdfStateTimer);
          pdfStateTimer = null;
        }
      }, 150);
    }

    function setupNavActiveState() {
      const sections = document.querySelectorAll('section[id]');
      const navLinks = document.querySelectorAll('nav a');
      const navMap = new Map();

      navLinks.forEach(a => {
        const href = a.getAttribute('href');
        if (href && href.startsWith('#')) navMap.set(href.slice(1), a);
      });

      const setActive = (id) => {
        navLinks.forEach(a => a.classList.remove('active'));
        const activeLink = navMap.get(id);
        if (activeLink) activeLink.classList.add('active');
      };

      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          const visible = entries
            .filter(e => e.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          if (visible.length > 0) {
            setActive(visible[0].target.id);
          }
        }, {
          root: null,
          rootMargin: '-35% 0px -45% 0px',
          threshold: [0.2, 0.4, 0.6]
        });

        sections.forEach(sec => observer.observe(sec));
      } else {
        let current = '';
        window.addEventListener('scroll', () => {
          sections.forEach(sec => {
            const top = sec.offsetTop - 100;
            if (scrollY >= top) current = sec.getAttribute('id');
          });
          if (current) setActive(current);
        }, { passive: true });
      }
    }

    function renderCompareGrid() {
      const grid = document.getElementById('compareGrid');
      const addBtn = document.getElementById('addLoanBtn');

      if (compareLoans.length >= 4) {
        addBtn.disabled = true;
        addBtn.style.opacity = '0.5';
        addBtn.style.pointerEvents = 'none';
      } else {
        addBtn.disabled = false;
        addBtn.style.opacity = '1';
        addBtn.style.pointerEvents = 'auto';
      }

      const colors = ['#C4622D', '#2D7BC4', '#2DB867', '#9B59B6'];
      grid.textContent = '';
      const frag = document.createDocumentFragment();

      compareLoans.forEach((loan, idx) => {
        const amountId = `loan-${loan.id}-amount`;
        const rateId = `loan-${loan.id}-rate`;
        const tenureId = `loan-${loan.id}-tenure`;
        const card = document.createElement('div');
        card.className = 'loan-card';
        card.style.borderTop = `3px solid ${colors[idx]}`;

        const header = document.createElement('div');
        header.className = 'loan-card-header';

        const title = document.createElement('span');
        title.className = 'loan-card-title';
        title.style.color = colors[idx];
        title.textContent = `Loan ${idx + 1}`;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.type = 'button';
        removeBtn.dataset.loanId = String(loan.id);
        removeBtn.title = 'Remove';
        removeBtn.textContent = '×';

        header.appendChild(title);
        header.appendChild(removeBtn);
        card.appendChild(header);

        card.appendChild(createCompareInput('Loan Amount (₹)', amountId, loan.amount, {
          min: '50000',
          max: '',
          step: '50000',
          loanId: loan.id,
          field: 'amount'
        }));
        card.appendChild(createCompareInput('Interest Rate (%)', rateId, loan.rate, {
          min: '1',
          max: '30',
          step: '0.1',
          loanId: loan.id,
          field: 'rate'
        }));
        card.appendChild(createCompareInput('Tenure (Years)', tenureId, loan.tenure, {
          min: '1',
          max: '30',
          step: '1',
          loanId: loan.id,
          field: 'tenure'
        }));

        frag.appendChild(card);
      });

      grid.appendChild(frag);

      grid.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.dataset.loanId, 10);
          if (!isNaN(id)) removeLoan(id);
        });
      });

      grid.querySelectorAll('input[data-loan-id][data-field]').forEach(input => {
        const handler = () => {
          const id = parseInt(input.dataset.loanId, 10);
          const field = input.dataset.field;
          if (!isNaN(id) && field) updateLoan(id, field, input.value);
        };
        input.addEventListener('input', handler);
        input.addEventListener('change', handler);
      });
    }

    function updateLoan(id, field, value) {
      const loan = compareLoans.find(l => l.id === id);
      if (!loan) return;
      loan[field] = parseFloat(value) || 0;
      updateCompareResults();
    }

    function calcEMIForLoan(amount, rate, tenureYears) {
      const P = amount, N = tenureYears * 12, r = rate / 12 / 100;
      if (P <= 0 || r <= 0 || N <= 0) return { emi: 0, total: 0, interest: 0 };
      const emi = P * r * Math.pow(1 + r, N) / (Math.pow(1 + r, N) - 1);
      const total = emi * N;
      return { emi, total, interest: total - P };
    }

    function updateCompareResults() {
      const resultsDiv = document.getElementById('compareResults');

      if (compareLoans.length === 0) {
        resultsDiv.style.display = 'none';
        return;
      }

      resultsDiv.style.display = 'block';

      const results = compareLoans.map((l, i) => ({
        ...l,
        idx: i + 1,
        ...calcEMIForLoan(l.amount, l.rate, l.tenure)
      }));
      const compareSummary = document.getElementById('compareBarChartSummary');
      if (compareSummary) {
        const parts = results.map(r => `Loan ${r.idx} interest ${formatCurrency(r.interest)}`);
        compareSummary.textContent = parts.join('. ') + '.';
      }

      const colors = ['#C4622D', '#2D7BC4', '#2DB867', '#9B59B6'];

      // Table
      const compareHead = document.getElementById('compareHead');
      const compareBody = document.getElementById('compareBody');
      compareHead.textContent = '';
      compareBody.textContent = '';

      const metricTh = document.createElement('th');
      metricTh.textContent = 'Metric';
      compareHead.appendChild(metricTh);

      results.forEach((r, i) => {
        const th = document.createElement('th');
        th.style.color = colors[i];
        th.textContent = `Loan ${r.idx}`;
        compareHead.appendChild(th);
      });

      const rows = [
        { label: 'Loan Amount', values: results.map(r => formatCurrency(r.amount)) },
        { label: 'Interest Rate', values: results.map(r => `${r.rate}%`) },
        { label: 'Tenure', values: results.map(r => `${r.tenure} Yrs`) },
        { label: 'Monthly EMI', values: results.map(r => formatCurrency(r.emi)), emphasize: true },
        { label: 'Total Payment', values: results.map(r => formatCurrency(r.total)) },
        { label: 'Total Interest', values: results.map(r => formatCurrency(r.interest)), interest: true }
      ];

      rows.forEach(row => {
        const tr = document.createElement('tr');
        const metricTd = document.createElement('td');
        metricTd.style.fontWeight = '600';
        metricTd.style.textAlign = 'left';
        metricTd.textContent = row.label;
        tr.appendChild(metricTd);

        row.values.forEach(value => {
          const td = document.createElement('td');
          if (row.emphasize) td.style.fontWeight = '700';
          if (row.interest) {
            td.style.color = '#C4622D';
            td.style.fontWeight = '700';
          }
          td.textContent = value;
          tr.appendChild(td);
        });

        compareBody.appendChild(tr);
      });

      // Bar Chart
      drawCompareBarChart(results, colors);
    }

    function createCompareInput(labelText, inputId, value, config) {
      const wrapper = document.createElement('div');
      wrapper.className = 'mini-input';

      const label = document.createElement('label');
      label.setAttribute('for', inputId);
      label.textContent = labelText;

      const input = document.createElement('input');
      input.type = 'number';
      input.id = inputId;
      input.value = String(value);
      input.min = config.min;
      if (config.max) input.max = config.max;
      input.step = config.step;
      input.dataset.loanId = String(config.loanId);
      input.dataset.field = config.field;

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      return wrapper;
    }

    function drawCompareBarChart(results, colors) {
      const canvas = document.getElementById('compareBarChart');
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const containerW = canvas.parentElement ? canvas.parentElement.offsetWidth : 600;
      const W = Math.min(600, containerW - 20);
      const H = Math.round(W * 0.5);

      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      if (results.length === 0) return;

      const pad = { top: 40, right: 30, bottom: 50, left: 80 };
      const chartW = W - pad.left - pad.right;
      const chartH = H - pad.top - pad.bottom;

      const maxInterest = Math.max(...results.map(r => r.interest), 1);
      const barW = Math.min(60, chartW / results.length - 20);

      // Title
      ctx.fillStyle = '#1A1612';
      ctx.font = '600 13px DM Sans';
      ctx.textAlign = 'center';
      ctx.fillText('Total Interest Comparison', W / 2, 24);

      // Y axis gridlines
      const ticks = 5;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let i = 0; i <= ticks; i++) {
        const y = pad.top + chartH - (i / ticks) * chartH;
        const val = (i / ticks) * maxInterest;

        ctx.strokeStyle = '#EDEBE6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(pad.left + chartW, y);
        ctx.stroke();

        ctx.fillStyle = '#8A857E';
        ctx.font = '400 10px DM Sans';
        ctx.fillText(formatCurrencyShort(val), pad.left - 8, y);
      }

      // Bars
      const totalBarArea = chartW;
      const gap = totalBarArea / results.length;

      results.forEach((r, i) => {
        const x = pad.left + gap * i + (gap - barW) / 2;
        const barH = (r.interest / maxInterest) * chartH;
        const y = pad.top + chartH - barH;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        roundRect(ctx, x + 2, y + 2, barW, barH, 6);
        ctx.fill();

        // Bar
        ctx.fillStyle = colors[i];
        roundRect(ctx, x, y, barW, barH, 6);
        ctx.fill();

        // Value label
        ctx.fillStyle = '#1A1612';
        ctx.font = '600 10px DM Sans';
        ctx.textAlign = 'center';
        ctx.fillText(formatCurrencyShort(r.interest), x + barW / 2, y - 8);

        // X label
        ctx.fillStyle = colors[i];
        ctx.font = '600 11px DM Sans';
        ctx.fillText('Loan ' + r.idx, x + barW / 2, pad.top + chartH + 20);
      });
    }

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    // ===== DOWNLOAD PDF =====
    function formatPDF(n) {
      if (isNaN(n) || !isFinite(n)) return 'Rs. 0';
      return 'Rs. ' + Math.round(n).toLocaleString('en-IN');
    }

    function downloadPDF() {
      try {
        if (!window.jspdf) {
          alert('PDF library is still loading. Please wait a moment and try again.\n\nIf the issue persists, please check your internet connection — the jsPDF library needs to load from CDN.');
          return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const accent = [196, 98, 45];
        const ink = [26, 22, 18];

        // Header
        doc.setFillColor(...ink);
        doc.rect(0, 0, 210, 32, 'F');
        doc.setTextColor(245, 242, 236);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('EMI Calculator Report', 14, 21);

        // Date
        doc.setFontSize(9);
        doc.setTextColor(180, 175, 168);
        const now = new Date();
        doc.text('Generated: ' + now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 196, 21, { align: 'right' });

        // Loan Details
        let y = 44;
        doc.setTextColor(...ink);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Loan Details', 14, y);
        y += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const P = document.getElementById('loanAmount').value;
        const R = document.getElementById('interestRate').value;
        const T = document.getElementById('tenure').value;

        doc.text('Loan Amount: ' + formatPDF(parseFloat(P)), 14, y); y += 7;
        doc.text('Interest Rate: ' + R + '% per annum', 14, y); y += 7;
        doc.text('Tenure: ' + T + ' Years (' + (T * 12) + ' months)', 14, y); y += 14;

        // Results Summary
        doc.setFillColor(...accent);
        doc.rect(14, y, 182, 0.8, 'F');
        y += 8;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('EMI Summary', 14, y);
        y += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Monthly EMI: ' + formatPDF(currentEMI), 14, y); y += 7;
        doc.text('Total Payment: ' + formatPDF(currentTotal), 14, y); y += 7;
        doc.text('Total Interest: ' + formatPDF(currentInterest), 14, y); y += 14;

        // Amortization Table
        if (amortizationData.length > 0) {
          doc.setFillColor(...accent);
          doc.rect(14, y, 182, 0.8, 'F');
          y += 8;
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Amortization Schedule', 14, y);
          y += 6;

          const tableBody = amortizationData.map(row => [
            row.month,
            formatPDF(row.emi),
            formatPDF(row.principal),
            formatPDF(row.interest),
            formatPDF(row.balance)
          ]);

          doc.autoTable({
            startY: y,
            head: [['Month', 'EMI (Rs.)', 'Principal (Rs.)', 'Interest (Rs.)', 'Balance (Rs.)']],
            body: tableBody,
            theme: 'grid',
            styles: {
              fontSize: 7.5,
              cellPadding: 3,
              lineColor: [229, 224, 216],
              lineWidth: 0.3,
              font: 'helvetica'
            },
            headStyles: {
              fillColor: ink,
              textColor: [245, 242, 236],
              fontStyle: 'bold',
              fontSize: 8
            },
            alternateRowStyles: {
              fillColor: [253, 250, 245]
            },
            margin: { left: 14, right: 14 }
          });
        }

        doc.save('EMI_Report.pdf');
      } catch (err) {
        console.error('PDF generation error:', err);
        alert('Error generating PDF: ' + err.message + '\n\nPlease ensure you have an active internet connection so the jsPDF library can load.');
      }
    }

    // ===== DOWNLOAD COMPARISON PDF =====
    function downloadComparisonPDF() {
      try {
        if (!window.jspdf) {
          alert('PDF library is still loading. Please wait a moment and try again.\n\nIf the issue persists, please check your internet connection.');
          return;
        }

        if (compareLoans.length === 0) {
          alert('Please add at least one loan to compare before downloading.');
          return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const ink = [26, 22, 18];
        const accent = [196, 98, 45];

        // Color definitions matching the UI
        const loanColors = [
          [196, 98, 45],   // Loan 1 - Orange/Terracotta
          [45, 123, 196],  // Loan 2 - Blue
          [45, 184, 103],  // Loan 3 - Green
          [155, 89, 182]   // Loan 4 - Purple
        ];

        // ---- Header Band ----
        doc.setFillColor(...ink);
        doc.rect(0, 0, 210, 32, 'F');
        doc.setTextColor(245, 242, 236);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Loan Comparison Report', 14, 21);

        // Date
        doc.setFontSize(9);
        doc.setTextColor(180, 175, 168);
        const now = new Date();
        doc.text('Generated: ' + now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), 196, 21, { align: 'right' });

        // ---- Build comparison data ----
        const results = compareLoans.map((l, i) => ({
          ...l,
          idx: i + 1,
          ...calcEMIForLoan(l.amount, l.rate, l.tenure)
        }));

        // ---- Comparison Table ----
        let y = 44;
        doc.setFillColor(...accent);
        doc.rect(14, y, 182, 0.8, 'F');
        y += 8;
        doc.setTextColor(...ink);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Comparison Details', 14, y);
        y += 6;

        // Table headers
        const headRow = ['Metric'];
        results.forEach((r, i) => headRow.push('Loan ' + r.idx));

        // Table body rows
        const bodyRows = [
          ['Loan Amount', ...results.map(r => formatPDF(r.amount))],
          ['Interest Rate', ...results.map(r => r.rate + '%')],
          ['Tenure', ...results.map(r => r.tenure + ' Yrs')],
          ['Monthly EMI', ...results.map(r => formatPDF(r.emi))],
          ['Total Payment', ...results.map(r => formatPDF(r.total))],
          ['Total Interest', ...results.map(r => formatPDF(r.interest))]
        ];

        doc.autoTable({
          startY: y,
          head: [headRow],
          body: bodyRows,
          theme: 'grid',
          styles: {
            fontSize: 9,
            cellPadding: 5,
            lineColor: [229, 224, 216],
            lineWidth: 0.3,
            font: 'helvetica',
            halign: 'center',
            valign: 'middle'
          },
          headStyles: {
            fillColor: ink,
            textColor: [245, 242, 236],
            fontStyle: 'bold',
            fontSize: 9
          },
          columnStyles: {
            0: { halign: 'left', fontStyle: 'bold', fillColor: [250, 248, 244] }
          },
          alternateRowStyles: {
            fillColor: [253, 250, 245]
          },
          // Color each loan column header individually
          didParseCell: function (data) {
            // Color loan column headers
            if (data.section === 'head' && data.column.index > 0) {
              var colorIdx = data.column.index - 1;
              if (colorIdx < loanColors.length) {
                data.cell.styles.fillColor = loanColors[colorIdx];
              }
            }
            // Highlight Total Interest row (last body row)
            if (data.section === 'body' && data.row.index === 5) {
              data.cell.styles.fillColor = [253, 232, 216];
              data.cell.styles.textColor = [180, 60, 20];
              data.cell.styles.fontStyle = 'bold';
            }
          },
          margin: { left: 14, right: 14 }
        });

        // ---- Footer note ----
        const pageH = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(140, 135, 128);
        doc.setFont('helvetica', 'italic');
        doc.text('Generated by EMI Calculator', 105, pageH - 12, { align: 'center' });

        doc.save('Loan_Comparison_Report.pdf');
      } catch (err) {
        console.error('Comparison PDF error:', err);
        alert('Error generating comparison PDF: ' + err.message);
      }
    }

    // ===== INIT =====
    bindStaticEvents();
    setupNavActiveState();
    initPdfButtonState();
    window.addEventListener('load', initPdfButtonState);
    calculateEMI();

    // ===== RESIZE HANDLER (redraw charts on orientation/resize) =====
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        calculateEMI();
        if (compareLoans.length > 0) updateCompareResults();
      }, 200);
    });
  

