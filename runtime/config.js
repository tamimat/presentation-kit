/*! Presentation Kit — MIT License. Copyright (c) 2026 Presentation Kit contributors. See LICENSE. */
(() => {
  const node = document.getElementById('presentation-config');
  const config = node ? JSON.parse(node.textContent) : {};
  const languages = config.languages || [{code:'en',label:'English'},{code:'ar',label:'العربية',dir:'rtl'}];
  const dictionaries = {
    en:{present:'Present',exit:'Exit',images:'Images only',language:'Presentation language',progress:'Slide progress',current:'Current slide',summary:'Slide summary',ended:'The live session has ended',unavailable:'This live session is no longer available',browse:'Browse presentation',endedDescription:'You can still explore every slide, move back and forth, and choose your own language.'},
    ar:{present:'عرض',exit:'خروج',images:'صور فقط',language:'لغة العرض',progress:'تقدّم العرض',current:'الشريحة الحالية',summary:'ملخص الشريحة',ended:'انتهت الجلسة المباشرة',unavailable:'هذه الجلسة المباشرة لم تعد متاحة',browse:'تصفّح العرض',endedDescription:'يمكنك تصفّح جميع الشرائح والتنقّل بينها واختيار اللغة التي تناسبك.'},
    zh:{present:'演示',exit:'退出',images:'仅图片',language:'演示语言',progress:'幻灯片进度',current:'当前幻灯片',summary:'幻灯片摘要',ended:'实时演示已结束',unavailable:'此实时演示已不可用',browse:'浏览演示文稿',endedDescription:'你仍然可以浏览所有幻灯片，前后翻页，并选择自己的语言。'},
    de:{present:'Präsentieren',exit:'Beenden',images:'Nur Bilder',language:'Präsentationssprache',progress:'Folienfortschritt',current:'Aktuelle Folie',summary:'Folienzusammenfassung',ended:'Die Live-Präsentation ist beendet',unavailable:'Diese Live-Präsentation ist nicht mehr verfügbar',browse:'Präsentation ansehen',endedDescription:'Du kannst weiterhin alle Folien ansehen, vor- und zurückblättern und deine Sprache wählen.'},
  };
  const labels = code => ({...dictionaries.en,...dictionaries[code],...config.labels?.[code]});
  function visibleLanguages(mode=document.body.dataset.captionMode) {
    return mode==='both'||mode==='none' ? languages.map(l=>l.code) : [mode];
  }
  function applyLanguages() {
    const allowed = visibleLanguages();
    document.querySelectorAll('.lang-en,.lang-ar,.lang-zh,.lang-de,[data-language]').forEach(el => {
      const code=el.dataset.language || (el.getAttribute('lang')||'').split('-')[0];
      if(code) el.hidden=!allowed.includes(code);
    });
  }
  window.PresentationKit={config,languages,labels,visibleLanguages,applyLanguages};
})();
