(function(){
  function getMetaVersion(doc){
    try{
      const m=(doc||document).querySelector('meta[name="app-version"]');
      return m && m.content ? m.content.trim() : '';
    }catch{ return ''; }
  }
  function setVersionText(v){
    if(!v) return;
    document.querySelectorAll('.app-version').forEach(el=>{ el.textContent = v; });
  }
  const local = getMetaVersion(document);
  if(local){ setVersionText(local); return; }
  try{
    fetch('index.html', { cache: 'no-store' })
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(html => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const v = getMetaVersion(doc) || '';
        setVersionText(v || 'v1.0');
      })
      .catch(()=> setVersionText('v1.0'));
  }catch{
    setVersionText('v1.0');
  }
})();
