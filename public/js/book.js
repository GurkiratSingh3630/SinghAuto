(async function () {
  const yearSel = document.getElementById("yearSelect");
  const makeSel = document.getElementById("makeSelect");
  const modelSel = document.getElementById("modelSelect");
  const hidden = document.getElementById("vehicleHidden");
  const form = document.querySelector('form[action="/book"]');
  const serviceSel = document.getElementById("serviceSelect");
  const estimateText = document.getElementById("priceEstimateText");

  if (!yearSel || !makeSel || !modelSel || !hidden || !form) return;

  let data = {};

  try {
    const res = await fetch("/data/vehicles.json");
    if (!res.ok) throw new Error("vehicles.json not found");
    data = await res.json();
  } catch (e) {
    console.error(e);
    data = {
      "2024": {
        Honda: ["Civic"],
        Toyota: ["Corolla"]
      }
    };
  }

  const years = Object.keys(data).sort((a, b) => Number(b) - Number(a));
  years.forEach((y) => {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    yearSel.appendChild(opt);
  });

  yearSel.addEventListener("change", () => {
    makeSel.innerHTML = "";
    modelSel.innerHTML = "";
    addPlaceholder(makeSel, "Select make");
    addPlaceholder(modelSel, "Select model");

    const y = yearSel.value;
    if (!y || !data[y]) {
      makeSel.disabled = true;
      modelSel.disabled = true;
      updateHidden();
      updateEstimate();
      return;
    }

    Object.keys(data[y])
      .sort()
      .forEach((mk) => {
        const opt = document.createElement("option");
        opt.value = mk;
        opt.textContent = mk;
        makeSel.appendChild(opt);
      });

    makeSel.disabled = false;
    modelSel.disabled = true;
    updateHidden();
    updateEstimate();
  });

  makeSel.addEventListener("change", () => {
    modelSel.innerHTML = "";
    addPlaceholder(modelSel, "Select model");

    const y = yearSel.value;
    const mk = makeSel.value;
    if (!y || !mk || !data[y] || !data[y][mk]) {
      modelSel.disabled = true;
      updateHidden();
      updateEstimate();
      return;
    }

    data[y][mk].forEach((md) => {
      const opt = document.createElement("option");
      opt.value = md;
      opt.textContent = md;
      modelSel.appendChild(opt);
    });

    modelSel.disabled = false;
    updateHidden();
    updateEstimate();
  });

  modelSel.addEventListener("change", () => {
    updateHidden();
    updateEstimate();
  });

  if (serviceSel) {
    serviceSel.addEventListener("change", () => {
      updateEstimate();
    });
  }

  form.addEventListener("submit", () => {
    updateHidden();
  });

  function addPlaceholder(select, text) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = text;
    select.appendChild(opt);
  }

  function updateHidden() {
    const y = yearSel.value;
    const mk = makeSel.value;
    const md = modelSel.value;
    const parts = [y, mk, md].filter(Boolean);
    hidden.value = parts.join(" ");
  }

  async function updateEstimate() {
    if (!serviceSel || !estimateText) return;

    const service = serviceSel.value;
    const year = yearSel.value;
    const make = makeSel.value;
    const model = modelSel.value;

    if (!service) {
      estimateText.textContent = "Select a service to see an estimated price range.";
      return;
    }

    const params = new URLSearchParams({
      service,
      year: year || "",
      make: make || "",
      model: model || ""
    });

    try {
      const res = await fetch("/api/estimate?" + params.toString());
      if (!res.ok) {
        throw new Error("Estimate error");
      }
      const est = await res.json();
      if (est.min == null || est.max == null) {
        estimateText.textContent = "Select a service to see an estimated price range.";
        return;
      }
      if (est.min === est.max) {
        estimateText.textContent = "Estimated price: $" + est.min.toFixed(0) + " before tax.";
      } else {
        estimateText.textContent =
          "Estimated range: $" +
          est.min.toFixed(0) +
          " – $" +
          est.max.toFixed(0) +
          " before tax.";
      }
    } catch (e) {
      console.error(e);
      estimateText.textContent = "Could not load estimate. Please try again.";
    }
  }
})();