// ============================================================
// data.js — Data Transform Helpers
// Flat (Google Sheets) ↔ Nested (HTML app internal format)
// ============================================================

const DataTransform = (() => {

  // ── FLAT → NESTED (Sheets → App) ──────────────────────────

  function packageToNested(p) {
    if (!p) return null;
    // Already nested? (has milestones object)
    if (p.milestones && typeof p.milestones === 'object') return p;

    const toBool = v => v === true || v === 'TRUE' || v === 'true' || v === 1 || v === 'YES';
    const toNum  = (v, def = 0) => { const n = parseFloat(v); return isNaN(n) ? def : n; };

    return {
      id: p.id,
      projectId: p.projectId,
      initiation: p.initiation || '',
      discipline: p.discipline || '',
      area: p.area || '',
      rfqNo: p.rfqNo || '',
      packageName: p.packageName || '',
      description: p.description || '',
      contractNo: p.contractNo || '',
      vendorName: p.vendorName || '',
      coo: p.coo || '',
      milestones: {
        issueRFQ:         { plan: p.ms_issueRFQ_plan         || '', actual: p.ms_issueRFQ_actual         || '' },
        receiveQuotation: { plan: p.ms_receiveQuotation_plan  || '', actual: p.ms_receiveQuotation_actual  || '' },
        issueTBE:         { plan: p.ms_issueTBE_plan          || '', actual: p.ms_issueTBE_actual          || '' },
        issueCBE:         { plan: p.ms_issueCBE_plan          || '', actual: p.ms_issueCBE_actual          || '' },
        finalNegotiation: { plan: p.ms_finalNegotiation_plan  || '', actual: p.ms_finalNegotiation_actual  || '' },
        issuePO:          { plan: p.ms_issuePO_plan           || '', actual: p.ms_issuePO_actual           || '' },
        kom:              { plan: p.ms_kom_plan               || '', actual: p.ms_kom_actual               || '' }
      },
      engineering: {
        required:       toBool(p.eng_required),
        planStart:      p.eng_planStart    || '',
        planFinish:     p.eng_planFinish   || '',
        actualStart:    p.eng_actualStart  || '',
        actualFinish:   p.eng_actualFinish || '',
        statusDate:     p.eng_statusDate   || '',
        planProgress:   toNum(p.eng_planProgress),
        actualProgress: toNum(p.eng_actualProgress),
        remark:         p.eng_remark       || ''
      },
      manufacture: {
        planStart:       p.mfg_planStart    || '',
        planFinish:      p.mfg_planFinish   || '',
        actualStart:     p.mfg_actualStart  || '',
        actualFinish:    p.mfg_actualFinish || '',
        statusDate:      p.mfg_statusDate   || '',
        planProgress:    toNum(p.mfg_planProgress),
        actualProgress:  toNum(p.mfg_actualProgress),
        remark:          p.mfg_remark       || '',
        planFAT:         p.mfg_planFAT      || '',
        actualFAT:       p.mfg_actualFAT    || '',
        fatResult:       p.mfg_fatResult    || '',
        fatRemarks:      p.mfg_fatRemarks   || ''
      },
      delivery: {
        incoterm:                p.del_incoterm                || '',
        deliveryLocation:        p.del_deliveryLocation        || '',
        planDelivery100:         p.del_planDelivery100         || '',
        actualDelivery100:       p.del_actualDelivery100       || '',
        shippingStatusDate:      p.del_shippingStatusDate      || '',
        shippingStatusPlan:      toNum(p.del_shippingStatusPlan),
        shippingStatus:          toNum(p.del_shippingStatus),
        planMaterialAtSite100:   p.del_planMaterialAtSite100   || '',
        actualMaterialAtSite100: p.del_actualMaterialAtSite100 || '',
        materialStatusDate:      p.del_materialStatusDate      || '',
        materialAtSitePlan:      toNum(p.del_materialAtSitePlan),
        materialReceivedActual:  toNum(p.del_materialReceivedActual)
      }
    };
  }

  function packagesToNested(flatArr) {
    return (flatArr || []).map(packageToNested);
  }

  // ── NESTED → FLAT (App → Sheets) ──────────────────────────

  function packageToFlat(p, now) {
    if (!p) return null;
    // Already flat? (has ms_ keys)
    if ('ms_issueRFQ_plan' in p) return Object.assign({}, p, { lastModified: now || p.lastModified });

    const ms  = p.milestones   || {};
    const eng = p.engineering  || {};
    const mf  = p.manufacture  || {};
    const d   = p.delivery     || {};
    const ts  = now || new Date().toISOString();

    return {
      id: p.id,
      projectId: p.projectId,
      initiation: p.initiation || '',
      discipline: p.discipline || '',
      area: p.area || '',
      packageName: p.packageName || '',
      description: p.description || '',
      rfqNo: p.rfqNo || '',
      contractNo: p.contractNo || '',
      vendorName: p.vendorName || '',
      coo: p.coo || '',
      ms_issueRFQ_plan:            ms.issueRFQ?.plan         || '',
      ms_issueRFQ_actual:          ms.issueRFQ?.actual        || '',
      ms_receiveQuotation_plan:    ms.receiveQuotation?.plan  || '',
      ms_receiveQuotation_actual:  ms.receiveQuotation?.actual || '',
      ms_issueTBE_plan:            ms.issueTBE?.plan          || '',
      ms_issueTBE_actual:          ms.issueTBE?.actual         || '',
      ms_issueCBE_plan:            ms.issueCBE?.plan          || '',
      ms_issueCBE_actual:          ms.issueCBE?.actual         || '',
      ms_finalNegotiation_plan:    ms.finalNegotiation?.plan  || '',
      ms_finalNegotiation_actual:  ms.finalNegotiation?.actual || '',
      ms_issuePO_plan:             ms.issuePO?.plan           || '',
      ms_issuePO_actual:           ms.issuePO?.actual          || '',
      ms_kom_plan:                 ms.kom?.plan               || '',
      ms_kom_actual:               ms.kom?.actual              || '',
      eng_required:        eng.required ? 'TRUE' : 'FALSE',
      eng_planStart:       eng.planStart    || '',
      eng_planFinish:      eng.planFinish   || '',
      eng_actualStart:     eng.actualStart  || '',
      eng_actualFinish:    eng.actualFinish || '',
      eng_statusDate:      eng.statusDate   || '',
      eng_planProgress:    eng.planProgress   ?? 0,
      eng_actualProgress:  eng.actualProgress ?? 0,
      eng_remark:          eng.remark         || '',
      mfg_planStart:       mf.planStart    || '',
      mfg_planFinish:      mf.planFinish   || '',
      mfg_actualStart:     mf.actualStart  || '',
      mfg_actualFinish:    mf.actualFinish || '',
      mfg_statusDate:      mf.statusDate   || '',
      mfg_planProgress:    mf.planProgress   ?? 0,
      mfg_actualProgress:  mf.actualProgress ?? 0,
      mfg_remark:          mf.remark         || '',
      mfg_planFAT:         mf.planFAT     || '',
      mfg_actualFAT:       mf.actualFAT   || '',
      mfg_fatResult:       mf.fatResult   || '',
      mfg_fatRemarks:      mf.fatRemarks  || '',
      del_incoterm:                d.incoterm               || '',
      del_deliveryLocation:        d.deliveryLocation       || '',
      del_planDelivery100:         d.planDelivery100        || '',
      del_actualDelivery100:       d.actualDelivery100      || '',
      del_shippingStatusDate:      d.shippingStatusDate     || '',
      del_shippingStatusPlan:      d.shippingStatusPlan     ?? 0,
      del_shippingStatus:          d.shippingStatus         ?? 0,
      del_planMaterialAtSite100:   d.planMaterialAtSite100  || '',
      del_actualMaterialAtSite100: d.actualMaterialAtSite100|| '',
      del_materialStatusDate:      d.materialStatusDate     || '',
      del_materialAtSitePlan:      d.materialAtSitePlan     ?? 0,
      del_materialReceivedActual:  d.materialReceivedActual ?? 0,
      lastModified: ts
    };
  }

  function packagesToFlat(nestedArr, now) {
    return (nestedArr || []).map(p => packageToFlat(p, now));
  }

  // ── RISKS ──────────────────────────────────────────────────

  function riskNormalize(r, projectId) {
    if (!r) return null;
    return {
      id: r.id,
      projectId: r.projectId || projectId || '',
      packageName: r.packageName || r.packageId || '',
      category: r.category || '',
      riskDescription: r.riskDescription || '',
      probability: r.probability || '',
      impact: r.impact || '',
      riskLevel: r.riskLevel || '',
      status: r.status || '',
      mitigation: r.mitigation || '',
      owner: r.owner || '',
      dueDate: r.dueDate || '',
      isAutoGenerated: r.isAutoGenerated === true || r.isAutoGenerated === 'TRUE' || r.isAutoGenerated === 'YES',
      generatedDate: r.generatedDate || '',
      lastModified: r.lastModified || new Date().toISOString()
    };
  }

  function risksNormalize(arr, projectId) {
    return (arr || []).map(r => riskNormalize(r, projectId));
  }

  return {
    packageToNested,  packagesToNested,
    packageToFlat,    packagesToFlat,
    riskNormalize,    risksNormalize
  };
})();
