document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('criminalRiskAssessmentForm');
  const firstName = document.querySelector('input[name="first_name"]');
  const lastName = document.querySelector('input[name="last_name"]');
  const nameConfirm = document.querySelector('input[name="name_confirm"]');

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = serializeForm(form);
      localStorage.setItem('criminalRiskAssessmentSubmission', JSON.stringify(data));
      window.location.href = 'submitted.html';
    });
  }

  if (firstName && lastName && nameConfirm) {
    const syncName = () => {
      const fullName = [firstName.value, lastName.value].filter(Boolean).join(' ').trim();
      nameConfirm.value = fullName;
    };

    firstName.addEventListener('input', syncName);
    lastName.addEventListener('input', syncName);
    syncName();
  }

  if (document.getElementById('summary')) {
    renderSummary();
  }
});

function serializeForm(form) {
  const data = {};
  const formData = new FormData(form);

  formData.forEach((value, key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      if (Array.isArray(data[key])) {
        data[key].push(value);
      } else {
        data[key] = [data[key], value];
      }
    } else {
      data[key] = value;
    }
  });

  return data;
}

function renderSummary() {
  const summary = document.getElementById('summary');
  const rawData = localStorage.getItem('criminalRiskAssessmentSubmission');

  if (!rawData) {
    summary.innerHTML = '<p class="empty-state">No submission has been recorded yet.</p>';
    return;
  }

  const data = JSON.parse(rawData);
  if (!Object.keys(data).length) {
    summary.innerHTML = '<p class="empty-state">No submission has been recorded yet.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  const list = document.createElement('dl');

  Object.entries(data).forEach(([key, value]) => {
    const term = document.createElement('dt');
    term.textContent = formatKey(key);
    const description = document.createElement('dd');
    description.textContent = formatValue(value);
    list.appendChild(term);
    list.appendChild(description);
  });

  fragment.appendChild(list);
  summary.innerHTML = '';
  summary.appendChild(fragment);
}

function formatValue(value) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (value === '' || value === null || value === undefined) {
    return '—';
  }
  return value;
}

function formatKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
