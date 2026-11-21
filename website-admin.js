/* Loads persisted public content from the PHP API. Local storage is fallback for offline preview only. */
(() => {
  'use strict';
  const applyText = (key, value) => { if (value == null) return; document.querySelectorAll(`[data-admin-field="${key}"]`).forEach(el => { el.textContent = value; }); };
  const applyAppearance = settings => {
    const root = document.documentElement;
    const colors = [['themePrimary', '--orange'], ['themeInk', '--ink'], ['themePaper', '--paper'], ['themeSurface', '--card-surface']];
    colors.forEach(([key, variable]) => {
      if (/^#[0-9a-f]{6}$/i.test(settings[key] || '')) root.style.setProperty(variable, settings[key]);
    });
    if (/^#[0-9a-f]{6}$/i.test(settings.themePrimary || '')) root.style.setProperty('--orange-dark', `color-mix(in srgb, ${settings.themePrimary} 80%, #000)`);
    if (/^#[0-9a-f]{6}$/i.test(settings.themeSurface || '')) root.style.setProperty('--glass-light', `color-mix(in srgb, ${settings.themeSurface} 68%, transparent)`);
    if (['glass', 'flat', 'outlined'].includes(settings.cardStyle)) root.dataset.cardStyle = settings.cardStyle;
    if (/^\d+$/.test(settings.cardRadius || '') && Number(settings.cardRadius) <= 28) root.style.setProperty('--glass-radius', `${settings.cardRadius}px`);
    if (/^\d+$/.test(settings.siteWidth || '') && Number(settings.siteWidth) >= 960 && Number(settings.siteWidth) <= 1440) root.style.setProperty('--site-container-width', `${settings.siteWidth}px`);
    if (/^\d+$/.test(settings.sectionSpacing || '') && Number(settings.sectionSpacing) >= 60 && Number(settings.sectionSpacing) <= 140) root.style.setProperty('--section-space-scale', String(Number(settings.sectionSpacing) / 100));
    if (['full', 'subtle', 'off'].includes(settings.motionMode)) root.dataset.motionMode = settings.motionMode;
  };
  const parseSetting = (value, fallback) => {
    if (typeof value !== 'string') return fallback;
    try { return JSON.parse(value); } catch { return fallback; }
  };
  const applyLayout = settings => {
    const main = document.querySelector('main');
    if (!main) return;
    const visibility = parseSetting(settings.sectionVisibility, {});
    const order = parseSetting(settings.sectionOrder, []);
    const custom = parseSetting(settings.customSections, []);
    const imageOverrides = parseSetting(settings.imageOverrides, {});
    const hiddenClientLogos = parseSetting(settings.hiddenClientLogos, []);
    main.querySelectorAll('[data-admin-section]').forEach(section => {
      const id = section.dataset.adminSection;
      section.classList.toggle('admin-hidden', visibility[id] === true);
      const position = Array.isArray(order) ? order.indexOf(id) : -1;
      if (position >= 0) section.style.order = String(position);
    });
    if (Array.isArray(custom)) custom.forEach((block, index) => {
      if (!block || typeof block.id !== 'string' || typeof block.title !== 'string' || typeof block.copy !== 'string') return;
      let section = main.querySelector(`[data-admin-custom="${block.id}"]`);
      if (!section) {
        section = document.createElement('section');
        section.className = 'section custom-admin-section';
        section.dataset.adminCustom = block.id;
        const container = document.createElement('div');
        container.className = 'container custom-admin-section-inner';
        const heading = document.createElement('h2');
        const copy = document.createElement('p');
        section.append(container);
        container.append(heading, copy);
        main.append(section);
      }
      const container = section.firstElementChild;
      const heading = container.querySelector('h2');
      const copy = container.querySelector('p');
      heading.textContent = block.title;
      copy.textContent = block.copy;
      const image = block.image && /^assets\/[A-Za-z0-9._/-]+$/.test(block.image) && !block.image.split('/').includes('..') ? block.image : '';
      let imageNode = container.querySelector('img');
      if (image) {
        if (!imageNode) { imageNode = document.createElement('img'); imageNode.alt = ''; container.insertBefore(imageNode, heading); }
        imageNode.src = image;
        container.classList.add('with-image');
      } else {
        container.classList.remove('with-image');
        if (imageNode) imageNode.remove();
      }
      section.classList.toggle('admin-hidden', visibility[block.id] === true);
      const position = Array.isArray(order) ? order.indexOf(block.id) : -1;
      section.style.order = String(position >= 0 ? position : 100 + index);
    });
    main.classList.toggle('admin-layout-active', Array.isArray(order) && order.length > 0);
    document.querySelectorAll('img[src^="assets/"]').forEach(image => {
      const source = image.getAttribute('src');
      const replacement = imageOverrides[source];
      if (typeof replacement === 'string' && replacement && /^assets\/[A-Za-z0-9._/-]+$/.test(replacement) && !replacement.split('/').includes('..')) image.setAttribute('src', replacement);
    });
    document.querySelectorAll('[data-admin-client-logo]').forEach(image => {
      image.closest('.clients-marquee-card, .clients-gallery-card')?.classList.toggle('admin-hidden', Array.isArray(hiddenClientLogos) && hiddenClientLogos.includes(image.dataset.adminClientLogo));
    });
  };
  const apply = data => {
    const c=data.content||{}, s=data.settings||{}, seo=data.seo||{};
    Object.entries(c).forEach(([key, value]) => applyText(key, value));
    applyAppearance(s);
    applyLayout(s);
    const pageView = new URLSearchParams(window.location.search).get('view');
    if (!pageView || pageView === 'home') {
      const title=seo.seoTitle||c.seoTitle, description=seo.seoDescription||c.seoDescription;
      if(title) document.title=title;
      if(description){let m=document.querySelector('meta[name="description"]');if(m)m.setAttribute('content',description);}
    }
    if(s.contactEmail) document.querySelectorAll('[data-admin-contact="email"]').forEach(el=>{el.href=`mailto:${s.contactEmail}`;if(el.textContent.includes('@'))el.textContent=s.contactEmail;});
    if(s.contactPhone){const digits=s.contactPhone.replace(/[^\d+]/g,'');document.querySelectorAll('[data-admin-contact="phone"]').forEach(el=>{el.href=`tel:${digits}`;if(el.textContent.includes('XXXXX')||el.textContent.includes('+91'))el.textContent=s.contactPhone;});}
  };
  fetch('api/index.php?action=public',{headers:{'Accept':'application/json'},cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('API unavailable');return r.json();}).then(apply).catch(()=>{
    try { const c=JSON.parse(localStorage.getItem('aadya_admin_content')||'{}'),s=JSON.parse(localStorage.getItem('aadya_admin_settings')||'{}'),seo=JSON.parse(localStorage.getItem('aadya_admin_seo')||'{}'); apply({content:{...c,seoTitle:seo.title,seoDescription:seo.description},settings:s}); } catch (_) {}
  });
})();
const aboutCommitmentStyle = document.createElement('style');
  aboutCommitmentStyle.id = 'about-commitment-hidden';
  aboutCommitmentStyle.textContent = '#about .about-commitment{display:none!important}';
  document.head.append(aboutCommitmentStyle);
