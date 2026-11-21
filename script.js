// Mobile navigation
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const siteHeader = document.querySelector('.site-header');
if (siteHeader) {
  const updateHeaderScrollState = () => {
    siteHeader.classList.toggle('is-scrolled', window.scrollY > 24);
  };
  window.addEventListener('scroll', updateHeaderScrollState, { passive: true });
  updateHeaderScrollState();
}
const navigationDropdowns = Array.from(document.querySelectorAll('.nav-dropdown'));
const closeNavigationDropdowns = except => navigationDropdowns.forEach(dropdown => {
  if (dropdown === except) return;
  dropdown.classList.remove('is-open');
  dropdown.querySelector('.nav-dropdown-toggle')?.setAttribute('aria-expanded', 'false');
  const menu = dropdown.querySelector('.nav-dropdown-menu');
  if (menu) menu.hidden = true;
});
if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
  navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }));
}
navigationDropdowns.forEach(dropdown => {
  const toggle = dropdown.querySelector('.nav-dropdown-toggle');
  const menu = dropdown.querySelector('.nav-dropdown-menu');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    closeNavigationDropdowns(dropdown);
    dropdown.classList.toggle('is-open', !isOpen);
    toggle.setAttribute('aria-expanded', String(!isOpen));
    menu.hidden = isOpen;
  });
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      const filter = link.dataset.productNavFilter;
      if (filter) {
        productFilters.find(button => button.dataset.productFilter === filter)?.click();
      }
      closeNavigationDropdowns();
    });
  });
});
if (navigationDropdowns.length) {
  document.addEventListener('click', event => {
    if (!navigationDropdowns.some(dropdown => dropdown.contains(event.target))) closeNavigationDropdowns();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      const openDropdown = navigationDropdowns.find(dropdown =>
        dropdown.querySelector('.nav-dropdown-toggle')?.getAttribute('aria-expanded') === 'true'
      );
      if (!openDropdown) return;
      const toggle = openDropdown.querySelector('.nav-dropdown-toggle');
      closeNavigationDropdowns();
      toggle?.focus();
    }
  });
}

// Reveal elements as they enter the viewport
const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  document.querySelectorAll('#services .service-card.reveal')
    .forEach(item => item.classList.add('reveal-pending'));
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -25px 0px' });
  revealItems.forEach(item => revealObserver.observe(item));
} else {
  revealItems.forEach(item => item.classList.add('is-visible'));
}

// Add restrained pointer-driven tilt to the existing public-site cards.
const premiumCards = document.querySelectorAll(
  '#about .about-pillar, #about .about-reason, #services .service-card, #solutions .solution-card, #process .process-step'
);
const canTiltCards = window.matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (canTiltCards.matches && !reducedMotion.matches) {
  premiumCards.forEach(card => {
    let frame = 0;
    card.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = card.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width * 2 - 1;
        const y = (event.clientY - bounds.top) / bounds.height * 2 - 1;
        card.style.setProperty('--card-tilt-x', `${-y * 4}deg`);
        card.style.setProperty('--card-tilt-y', `${x * 4}deg`);
      });
    });
    card.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      card.style.removeProperty('--card-tilt-x');
      card.style.removeProperty('--card-tilt-y');
    });
  });
}

// Rotate the hero imagery while keeping the controls usable and motion-sensitive.
const hero = document.querySelector('.hero');
const heroSlides = Array.from(document.querySelectorAll('.hero [data-hero-slide]'));
const heroSlideControls = Array.from(document.querySelectorAll('.hero-slide-controls button'));
if (hero && heroSlides.length && heroSlideControls.length === heroSlides.length) {
  let activeHeroSlide = 0;
  let heroAutoplayTimer;
  const setHeroSlide = index => {
    activeHeroSlide = (index + heroSlides.length) % heroSlides.length;
    heroSlides.forEach((slide, slideIndex) => {
      slide.classList.toggle('is-active', slideIndex === activeHeroSlide);
    });
    heroSlideControls.forEach((control, controlIndex) => {
      const isActive = controlIndex === activeHeroSlide;
      control.classList.toggle('is-active', isActive);
      control.setAttribute('aria-pressed', String(isActive));
    });
  };
  const stopHeroAutoplay = () => {
    window.clearInterval(heroAutoplayTimer);
    heroAutoplayTimer = undefined;
  };
  const startHeroAutoplay = () => {
    stopHeroAutoplay();
    if (reducedMotion.matches || document.hidden || hero.matches(':hover') || hero.contains(document.activeElement)) return;
    heroAutoplayTimer = window.setInterval(() => setHeroSlide(activeHeroSlide + 1), 6500);
  };

  heroSlideControls.forEach((control, index) => {
    control.addEventListener('click', () => {
      setHeroSlide(index);
      startHeroAutoplay();
    });
  });
  hero.addEventListener('pointerenter', stopHeroAutoplay);
  hero.addEventListener('pointerleave', startHeroAutoplay);
  hero.addEventListener('focusin', stopHeroAutoplay);
  hero.addEventListener('focusout', event => {
    if (!hero.contains(event.relatedTarget)) startHeroAutoplay();
  });
  document.addEventListener('visibilitychange', startHeroAutoplay);
  reducedMotion.addEventListener('change', startHeroAutoplay);
  startHeroAutoplay();
}

// Let visitors narrow the solutions list to the equipment and support they need.
const solutionCards = Array.from(document.querySelectorAll('#solutions .solution-card'));
const solutionFilters = Array.from(document.querySelectorAll('[data-solution-filter]'));
const solutionResults = document.getElementById('solution-results');
if (solutionCards.length && solutionFilters.length) {
  const matchesSolutionFilter = (card, filter) => {
    const category = card.dataset.solutionCategory;
    return filter === 'all' || category === filter || (filter === 'support' && category === 'support');
  };

  solutionFilters.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.solutionFilter;
      let visibleCount = 0;
      solutionFilters.forEach(filterButton => {
        const isActive = filterButton === button;
        filterButton.classList.toggle('is-active', isActive);
        filterButton.setAttribute('aria-pressed', String(isActive));
      });
      solutionCards.forEach(card => {
        const isVisible = matchesSolutionFilter(card, filter);
        card.hidden = !isVisible;
        if (isVisible) {
          visibleCount += 1;
          requestAnimationFrame(() => card.classList.add('is-visible'));
        } else {
          card.classList.remove('is-visible');
        }
      });
      if (solutionResults) solutionResults.textContent = `Showing ${visibleCount} ${visibleCount === 1 ? 'solution' : 'solutions'}`;
    });
  });
}

// Filter the product catalog and carry the selected item into the quote form.
const productCards = Array.from(document.querySelectorAll('#products .product-card'));
const productFilters = Array.from(document.querySelectorAll('[data-product-filter]'));
const productResults = document.getElementById('product-results');
if (productCards.length && productFilters.length) {
  productFilters.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.productFilter;
      let visibleCount = 0;
      productFilters.forEach(filterButton => {
        const isActive = filterButton === button;
        filterButton.classList.toggle('is-active', isActive);
        filterButton.setAttribute('aria-pressed', String(isActive));
      });
      productCards.forEach(card => {
        const isVisible = filter === 'all' || card.dataset.productCategory === filter;
        card.hidden = !isVisible;
        if (isVisible) {
          visibleCount += 1;
          requestAnimationFrame(() => card.classList.add('is-visible'));
        } else {
          card.classList.remove('is-visible');
        }
      });
      if (productResults) productResults.textContent = `Showing ${visibleCount} ${visibleCount === 1 ? 'product' : 'products'}`;
    });
  });
}

const spareParts = [
  ['INDS57020L', 'Sigma Fluid S-570 oil 20 ltr container'],
  ['6.3747.00010', 'Vacuum suction nozzle'],
  ['8.2449.2', 'KIT maintenance ECO-DRAIN 12/12 CO'],
  ['400848.10020', 'KIT revision comb./thermost. valve 75°C'],
  ['7.8607.00110', 'Control cable W117'],
  ['404329.0', 'KIT control lines DN4'],
  ['6.3572.0', 'Filter mat 112x112x10'],
  ['7.4519.0', 'Filter mat 170x170x10'],
  ['7.7040E3', 'Pressure transducer 0-16bar 4-20mA'],
  ['400940.2', 'KIT mainten. control and venting valve M'],
  ['404444.0', 'KIT maintenance inlet valve DN200'],
  ['7.8607.00060', 'Cable SC2 W117 X14 2x0,5²x6700 C'],
  ['5.1123.0', 'Pipe seal holder Ø60'],
  ['7.7243.00080', 'Cable SC W113 3x0,5²x2000'],
  ['2.8542E10010', 'KIT dirt trap M17x1'],
  ['400994.00040', 'KIT maintenance comb./therm. valve 85°C'],
  ['405292.0', 'KIT maintenance inlet valve DN150'],
  ['400877.0', 'KIT maintenance comb./therm. valve 85°C'],
  ['403803.0', 'KIT control lines DN4'],
  ['404128.1', 'KIT maintenance comb./therm. valve ETM'],
  ['404091.2', 'KIT maintenance comb./therm. valve ETM'],
  ['405275.0', 'KIT maintenance inlet valve DN200'],
  ['400711.1', 'MAINTENANCE KIT - MPCV'],
  ['7.4801E3', 'KIT pneumatic valve R1/8 3/2-W'],
  ['7.7038E0', 'Resistance thermometer PT100 60MM Ø8/5'],
  ['213273.0', 'Control air line DN6x1170'],
  ['213431.0', 'Control air line DN4x2300'],
  ['211566.0', 'Control air line DN4x1850'],
  ['7.8607.00320', 'Cable SC2 W117 X14 2x0,34²|22AWGx5000 C'],
  ['INDS5704L', 'Sigma Fluid S-570 oil 4 ltr container'],
  ['4E0301.00010', 'KIT air filter cartridge Ø420x95mm'],
  ['400892.0', 'KIT maintenance inlet valve'],
  ['404129.0', 'KIT control lines DN4/DN6'],
  ['219012E0040', ''],
  ['8.8055.0', 'Lever grease gun w. accessories'],
  ['7.4519.00040', 'Filter mat 216x216x10'],
  ['9.5780.00010', 'Filter dryer ADK 510 MMS Ø10'],
  ['5.3353.00040', 'Foam filter mat 760x238x20'],
  ['89646.00080', ''],
  ['213428.0', 'Control air line DN6x1600'],
  ['6.3623.0', 'KIT oil separator cartridge Ø280x460mm'],
  ['6.3569.0', 'KIT oil separator cartridge Ø220x270mm'],
  ['4E0304.00010', 'KIT air filter cartridge Ø420x305mm'],
  ['4E0305.00010', 'KIT air filter cartridge Ø420x375mm'],
  ['490107.10010', 'SET filters compressor SK'],
  ['213386.0', 'Control air line DN4x380'],
  ['404444.00020', 'KIT maintenance inlet valve DN150'],
  ['6.4993.1', 'Filter fleece Ø420'],
  ['7.4519.00010', 'Filter mat 283x283x10'],
  ['490111.00011', 'SET filters compressor ASK'],
  ['404945.1', 'SET filters compressor SM'],
  ['490103.2', 'SET filters compressor SM'],
  ['4E0834.0', 'KIT Control unit f. Ventilator radial'],
  ['4E0835.0', 'KIT Control unit f. Ventilator radial'],
  ['400998.0', 'KIT control lines DN4/DN6'],
  ['6.3792.20010', 'KIT oil separator cartridge Ø100x170mm'],
  ['6.4161.0', 'Air filter cartridge Ø120x70'],
  ['402313.0', 'KIT maintenance MP check valve'],
  ['402156.0', 'KIT maintenance MP check valve DN80'],
  ['6.3463.0', 'Oil filter 25bar'],
  ['6.3795.10010', 'KIT oil separator cartridge Ø100x110mm'],
  ['6.5212.0', 'Air filter cartridge Ø140x100'],
  ['6.4163.0', 'Air filter cartridge Ø120x135'],
  ['6.3462.1', 'Oil filter 16bar'],
  ['8.2474.01510', 'KIT Service-UNIT ECO-DRAIN 31/31F Vario'],
  ['400995.10030', 'KIT revision comb./thermost. valve 80°C'],
  ['490100.0', 'SET filters compressor SX'],
  ['901521.0', 'Filter element E9KE'],
  ['7.7601.0', 'Controller SC2MCS'],
  ['6.3234.0', 'Anti-friction bearing grease Unirex N3 4'],
  ['9.4863.0', 'Filter element E-E-28'],
  ['901523.0', 'Filter element E22KE'],
  ['901544.0', 'Filter element E26KD'],
  ['6.3465.0', 'Oil filter 16bar'],
  ['8.1928.1', 'Hose line DN9x1500'],
  ['9.3020.1', 'Oil circuit cleaner 01L2050'],
  ['8.1889.00010', ''],
  ['400933.0', 'KIT control lines DN4/DN6'],
  ['4E0302.00010', 'KIT air filter cartridge Ø420x135mm'],
  ['901527.0', 'Filter element E110KE'],
  ['901567.0', 'Filter element E110KA'],
  ['6.4778.0', 'Oil filter insert 155mm'],
  ['6.3464.1', 'Oil filter 25bar'],
  ['6.4693.0', 'Oil filter insert 398mm'],
  ['6.4493.0', 'Oil filter insert 298mm'],
  ['8.0712.3', 'ECO-DRAIN 12 230VAC'],
  ['8.02474.01540', ''],
  ['8.2580.20040', ''],
  ['401827.0', 'KIT maintenance inlet valve DN60'],
  ['400990.0', 'KIT maintenance inlet valve DN80'],
  ['400706.0', 'KIT mainten. control and venting valve M'],
  ['401811.00020', 'KIT maintenance comb./therm. valve 75°C'],
  ['400888.0', 'KIT maintenance comb./therm. valve 70°C'],
  ['401819.0', 'KIT maintenance MP check valve DN25'],
  ['400707.00020', 'KIT revision control and venting valve M'],
  ['402140.0', 'KIT maintenance MP check valve'],
  ['400905.0', 'KIT mainten. control and venting valve M'],
  ['400707.0', 'KIT revision control and venting valve M'],
  ['400706.00010', 'KIT mainten. control and venting valve M'],
  ['403758.0', 'KIT maintenance venting valve M25x1'],
  ['403756.0', 'KIT maintenance venting valve M17x1'],
  ['400994.00020', 'KIT maintenance comb./therm. valve 75°C'],
  ['400994.00030', 'KIT maintenance comb./therm. valve 80°C'],
  ['401972.0', 'KIT maintenance pneumatic R1/8'],
  ['400952.00020', 'KIT maintenance comb./therm. valve 75°C'],
  ['403296.0', 'KIT maintenance inlet valve DN60'],
  ['7.7605P0', ''],
  ['7.7465E10030', 'Pressure transducer -100-50mbar 4-20m'],
  ['7.7465E1', ''],
  ['400711.10021', 'KIT maintenance MP check valve'],
  ['400982.3', 'KIT maintenance MP check valve'],
  ['404249.0', 'KIT maintenance inlet valve DN60'],
  ['401821.0', 'KIT maintenance inlet valve DN65'],
  ['400992.1', 'KIT maintenance MP check valve'],
  ['222958E10010', 'KIT maintenance overflow valve'],
  ['5.3353.0', 'Foam filter mat 393x308x20'],
  ['6.2591.0', 'V-belt set 3 XPZ 875'],
  ['6.3769.0', 'V-ribbed belt 8 PK 988'],
  ['6.4834.0', 'V-ribbed belt 8 PK 1165'],
  ['6.3772.0', 'V-ribbed belt 8 PK 960'],
  ['6.3777.0', 'V-ribbed belt 8 PL 1270'],
  ['6.3776.0', 'V-ribbed belt 8 PL 1219'],
  ['6.4835.0', 'V-ribbed belt 8 PK 1207'],
  ['6.4832.0', 'V-ribbed belt 8 PK 1080'],
  ['6.4273.0', 'KIT oil separator cartridge Ø400x512mm'],
  ['6.47272.2', 'KIT oil separator cartridge Ø400x512mm'],
  ['7.8376.0', 'Temperature transducer -5-65°C 4-20mA'],
  ['7.7010.0', 'Installation adapter A11'],
  ['IND30.000.8', 'Pressure transmitter rel -0.8-7bar 4-20m'],
  ['5.5340E20010', 'Cap for air filter'],
  ['400995.1003', 'KIT revision comb./thermost. valve 80°C'],
  ['4E0548.0', 'KIT Protective sleeve motor cable'],
  ['6.4272.2', 'KIT oil separator cartridge Ø326x525mm'],
  ['9.4878.0', 'Filter Element E-F-107'],
  ['5.3129E3', 'KIT drive coupling Ø138/Ø138'],
  ['4E0303.00010', 'KIT air filter cartridge Ø420x210mm'],
  ['7.8605.00020', 'Cable SC2 W115 X11 2x0,5²x1300 C'],
  ['403600.0', 'KIT control lines DN4/DN6'],
  ['5.3131E1', 'KIT drive coupling Ø222/Ø222'],
  ['901525.0', 'Filter element E46KE'],
  ['7.8607.00300', 'Cable SC2 W117 X14 2x0,34²|22AWGx3000 C'],
  ['7.8291E0', 'KIT Resistance thermometer PT100'],
  ['400925.10001', 'KIT maintenance inlet valve DN150'],
  ['6.2185.0', 'Air filter cartridge Ø298x594'],
  ['6.3817.1', 'V-ribbed belt 5 PK 960'],
  ['831057.00010', 'OMEGA FLUID SB220 1 l'],
  ['6.3789.0', 'KIT oil separator cartridge Ø142x230mm'],
  ['6.3571.0', 'KIT oil separator cartridge Ø220x380mm'],
  ['6.3669.0', 'KIT oil separator cartridge Ø170x305mm'],
  ['6.4139.1', 'Air filter cartridge Ø328x95'],
  ['6.4143.1', 'Air filter cartridge Ø303x90'],
  ['401975.0', 'Shaft seal,Kit OMEGA 62/63/64'],
  ['400893.1', 'KIT revision inlet valve'],
  ['213205.0', 'Control air line DN4x580'],
  ['213209.00030', 'Control air line DN4x1900'],
  ['213270.0', 'Control air line DN4x480'],
  ['IN9.1356.0', 'Centrifugal separator ZK01 G 3/4 PS16'],
  ['6.2182.0', 'Air filter cartridge Ø240x539'],
  ['102122.10701', 'Compressed Air Filter'],
  ['404092.1', 'KIT maintenance comb./therm. valve ETM'],
  ['7.8768E2', 'Resistance thermometer PT100'],
  ['213208.0', 'Control air line DN4x1200'],
  ['213264.0', 'Control air line DN4x1500'],
  ['901565.0', 'Filter element E46KA'],
  ['224714.0', 'Control air line DN4x4000'],
  ['893199.0', 'Filter fleece DN100'],
  ['4E0064.0', 'KIT bracket air filter'],
  ['9.1000.10100', 'Spiral hose DN150x900'],
  ['219012E00040', 'Purging line'],
  ['893849.0', 'Filter fleece DN200'],
  ['9.6771.0', 'SIGMA FLUID S-570 208 l'],
  ['1.6993E1', 'Exchange block SIGMA 16'],
  ['9.4202.00010', 'Filter dryer ADK 036 MMS, Ø6'],
  ['400771.0', 'KIT maintenance inlet valve'],
  ['401809.0', 'KIT maintenance inlet valve DN130'],
  ['5.3246E4', 'KIT drive coupling Ø169/Ø169'],
  ['403839.0', 'KIT control lines DN4'],
  ['7.9221.02026', ''],
  ['5.33791.1', ''],
  ['9.9353E10010', 'KIT refrigerant condenser'],
  ['8.2474.01890', 'KIT Service-UNIT ECO-DRAIN 31 Vario'],
  ['403287.00010', 'KIT revision comb./thermost. valve 85°C'],
  ['901506.0', 'Filter element E83KB'],
  ['8.2580.30040', 'ECO-DRAIN 31 Vario 18-72VDC'],
  ['9E0373.0', 'Air filter cart. Dia 465.9 x 232'],
  ['205300E10050', 'KIT venting valve M25x1'],
  ['213207.0', 'Control air line DN4x2400'],
  ['7.7602E1', 'KIT I/O Module SC2IOM-1'],
  ['7.7603E1', 'KIT I/O Module SC2IOM-2'],
  ['7.8605.00030', 'Cable SC2 W115 X11 2x0,5²x900 C'],
  ['400867.0', 'KIT control lines DN4'],
  ['INDI30.000.8', 'Pressure Transmitter Rel']
];

const sparePartByNumber = new Map();
spareParts.forEach(([partNumber, description]) => {
  sparePartByNumber.set(`${partNumber}\t${description}`, { id: partNumber, brand: 'kaeser', partNumber, description });
});
const sparePartCatalog = Array.from(sparePartByNumber.values()).map(part => {
  const description = part.description.toLowerCase();
  const category = /fluid|grease|lubricant|cleaner/.test(description)
      ? 'fluids'
      : /filter|fleece/.test(description)
        ? 'filters'
      : /kit|set filters|maintenance/.test(description)
        ? 'kits'
        : 'components';
  return { ...part, model: 'Confirm by compressor model', category };
});
const everestSpareParts = [
  ['Double lip seal (REP)', 'ESPH 300/400'],
  ['Piston bush, suction side', 'ESPH 300IH'],
  ['O-ring for slip sleeve, discharge side', 'ESPH 300IH'],
  ['O-ring for slip seal housing', 'ESPH 300IH'],
  ['Slip sleeve seal housing', 'ESPH 300/400'],
  ['Viton O-ring for slip sleeve, suction side', 'ESPH 300IH'],
  ['Spacer, suction side', 'ESPH 300/400'],
  ['Piston rings', 'ESPH 300'],
  ['Lock nut, standard KM8', 'Confirm by pump model'],
  ['Solenoid valve for solvent flushing', 'Confirm by pump model'],
  ['O-ring set', 'ESPH 300'],
  ['O-ring 1', 'ESPH 300/400'],
  ['O-ring 2', 'ESPH 300/400'],
  ['Timing gear lock assembly', 'ESPH 300'],
  ['Angular ball bearing', 'ESPH 300'],
  ['Locknut KM8', 'Confirm by pump model'],
  ['Star washer MB7', 'Confirm by pump model'],
  ['Star washer MB8', 'Confirm by pump model'],
  ['Mechanical seal', 'ESPH 150'],
  ['Slip sleeve with O-ring seal housing', 'ESPH 150'],
  ['Flingers', 'ESPH 150'],
  ['O-ring for M seal rotator', 'ESPH 150'],
  ['Star washer MB5', 'ESPH 150'],
  ['Spacer B, suction side', 'ESPH 150'],
  ['Spacer A, discharge side', 'ESPH 150'],
  ['Mesh filter', 'ESPH 150'],
  ['Solenoid valve for N2 seal purge', 'Confirm by pump model'],
  ['Sleeve, discharge side', 'ESPH 300IH'],
  ['Timing gear wheel', 'Confirm by pump model']
].map(([description, model], index) => ({
  id: `everest-esph-${String(index + 1).padStart(3, '0')}`,
  brand: 'everest',
  partNumber: '',
  description,
  model,
  category: /filter/.test(description.toLowerCase()) ? 'filters' : 'components'
}));
sparePartCatalog.push(...everestSpareParts);
const sparePartDetailParameters = new URLSearchParams(window.location.search);
const sparePartBrand = sparePartDetailParameters.get('brand') === 'everest' ? 'everest' : 'kaeser';
const activeSparePartCatalog = sparePartCatalog.filter(part => part.brand === sparePartBrand);

const sparePartsList = document.getElementById('spare-parts-list');
const sparePartsSearch = document.getElementById('spare-parts-search');
const sparePartsResults = document.getElementById('spare-parts-results');
const sparePartsEmpty = document.getElementById('spare-parts-empty');
const sparePartsPagination = document.getElementById('spare-parts-pagination');
const sparePartsPageLabel = document.getElementById('spare-parts-page');
const sparePartsPrevious = document.getElementById('spare-parts-previous');
const sparePartsNext = document.getElementById('spare-parts-next');
const sparePartFilters = Array.from(document.querySelectorAll('[data-spare-filter]'));
const sparePartPageSize = 12;
let sparePartFilter = 'all';
let sparePartPage = 1;
let filteredSpareParts = activeSparePartCatalog;
const sparePartImages = [
  {
    matches: /sigma fluid|omega fluid|lubricant|grease|oil circuit cleaner/,
    src: 'https://us.kaeser.com/Media/rotary_screw_compressors_direct_drive_46-9353-300x168.png',
    alt: 'KAESER fluid-injected rotary screw compressor reference for compressor fluid and lubricant parts',
    label: 'COMPRESSOR FLUIDS'
  },
  {
    matches: /vacuum/,
    src: 'https://us.kaeser.com/Media/How%20it%20Works_Schmatic-w-nos_BSV_1320x788_46-9148-660x394.png',
    alt: 'KAESER rotary screw vacuum pump component diagram',
    label: 'VACUUM COMPONENTS',
    fit: 'contain'
  },
  {
    matches: /eco-drain|condensate drain/,
    src: 'https://us.kaeser.com/Media/ECO-DRAIN-components_46-7891-364x290.png',
    alt: 'KAESER ECO-DRAIN component diagram with level sensor and valve',
    label: 'ECO-DRAIN COMPONENTS',
    fit: 'contain'
  },
  {
    matches: /filter dryer|dryer/,
    src: 'https://us.kaeser.com/Media/refrigation-dryers_46-7437-220x123.png',
    alt: 'KAESER refrigerated compressed-air dryer',
    label: 'AIR TREATMENT'
  },
  {
    matches: /filter mat|filter fleece/,
    src: 'https://us.kaeser.com/Media/KAESER-Filters-structure2_46-13052-364x500.png',
    alt: 'KAESER compressed-air filter element structure and filter media',
    label: 'FILTER MEDIA',
    fit: 'contain'
  },
  {
    matches: /filter|fleece/,
    src: 'https://us.kaeser.com/Media/filters-1400x788_46-131402-300x169.png',
    alt: 'KAESER in-line compressed-air filter equipment',
    label: 'COMPRESSED-AIR FILTERS'
  },
  {
    matches: /transducer|transmitter|thermometer|pt100|sensor/,
    src: 'https://us.kaeser.com/Media/Measuring-equipment-compressor-station-room-monitoring_46-187684-660x371.jpg',
    alt: 'KAESER measuring equipment and sensor monitoring for a compressor station',
    label: 'MEASUREMENT SENSORS'
  },
  {
    matches: /controller|control unit|i\/o module|module|cable/,
    src: 'https://us.kaeser.com/Media/Sigma-Control-2_46-6971-300x169.png',
    alt: 'KAESER SIGMA CONTROL 2 compressor controller',
    label: 'COMPRESSOR CONTROLS'
  },
  {
    matches: /control air lines?|control lines?|hose|spiral hose|pipe|piping/,
    src: 'https://us.kaeser.com/Media/smartpipe-fitting_46-60287-660x371.png',
    alt: 'KAESER SmartPipe compressed-air piping and connection fittings',
    label: 'AIR LINES & FITTINGS'
  },
  {
    matches: /valve|dirt trap|shaft seal/,
    src: 'https://us.kaeser.com/Media/1_46-8833-660x400.png',
    alt: 'KAESER compressed-air station with a pressure-holding valve in the air main charging system',
    label: 'VALVE SYSTEMS'
  },
  {
    matches: /belt|coupling|bearing/,
    src: 'https://us.kaeser.com/Media/3-30-hp-screw-compressors_46-273055-300x168.png',
    alt: 'KAESER belt-drive rotary screw compressor reference for drive components',
    label: 'DRIVE COMPONENTS'
  },
  {
    matches: /kit|set filters|maintenance/,
    src: 'https://us.kaeser.com/Media/Service-quickly-on-site_46-10180-220x123.png',
    alt: 'KAESER service vehicle stocked with compressor maintenance parts',
    label: 'SERVICE KITS'
  },
  {
    matches: /kit|set filters|maintenance/,
    src: 'https://us.kaeser.com/Media/Service-quickly-on-site_46-10180-220x123.png',
    alt: 'KAESER service vehicle carrying compressor maintenance parts',
    label: 'SERVICE PARTS'
  },
  {
    matches: /.*/,
    src: 'https://us.kaeser.com/Media/rotary_screw_compressors_all-in-one_46-9673-300x168.png',
    alt: 'KAESER compressed-air system',
    label: 'KAESER SYSTEMS'
  }
];

const getSparePartImage = description => {
  const normalizedDescription = description.toLowerCase();
  return sparePartImages.find(imageDetails => imageDetails.matches.test(normalizedDescription));
};
const getCatalogPartImage = part => {
  if (part.brand !== 'everest') return getSparePartImage(part.description);
  const description = part.description.toLowerCase();
  const imageTypes = [
    {
      matches: /solenoid/,
      file: 'solenoid-valve.svg',
      alt: 'Illustration of a vacuum-pump solenoid valve; confirm exact configuration by model',
      label: 'SOLENOID VALVE'
    },
    {
      matches: /timing gear/,
      file: 'timing-gear.svg',
      alt: 'Illustration of intermeshing timing gears for a vacuum-pump assembly',
      label: 'TIMING GEARS'
    },
    {
      matches: /angular ball bearing/,
      file: 'bearing.svg',
      alt: 'Illustration of an angular-contact ball bearing',
      label: 'BALL BEARING'
    },
    {
      matches: /mechanical seal/,
      file: 'mechanical-seal.svg',
      alt: 'Illustration of a mechanical shaft seal assembly',
      label: 'MECHANICAL SEAL'
    },
    {
      matches: /flinger/,
      file: 'oil-flinger.svg',
      alt: 'Illustration of a metal oil flinger disc used to direct lubricant in rotating equipment',
      label: 'OIL FLINGER'
    },
    {
      matches: /mesh filter/,
      file: 'mesh-filter.svg',
      alt: 'Illustration of a metal mesh pump filter',
      label: 'MESH FILTER'
    },
    {
      matches: /piston rings?/,
      file: 'piston-rings.svg',
      alt: 'Illustration of a set of piston rings',
      label: 'PISTON RINGS'
    },
    {
      matches: /piston bush/,
      file: 'piston-bush.svg',
      alt: 'Illustration of a piston bush and machined pump component',
      label: 'PISTON BUSH'
    },
    {
      matches: /slip sleeve with o[\s-]?ring|slip sleeve seal housing/,
      file: 'sleeve-spacer.svg',
      alt: 'Illustration of a pump slip sleeve and seal housing',
      label: 'SLIP SLEEVE'
    },
    {
      matches: /o[\s-]?rings?|double lip seal|lip seal|seal rotator/,
      file: 'seals.svg',
      alt: 'Illustration of vacuum-pump O-rings and rotary lip seals',
      label: 'O-RINGS & LIP SEALS'
    },
    {
      matches: /slip sleeve|sleeve|spacer/,
      file: 'sleeve-spacer.svg',
      alt: 'Illustration of a machined pump sleeve and spacer components',
      label: 'SLEEVES & SPACERS'
    },
    {
      matches: /lock ?nuts?|star washer/,
      file: 'fasteners.svg',
      alt: 'Illustration of pump lock nuts and star washers',
      label: 'NUTS & WASHERS'
    }
  ];
  const imageType = imageTypes.find(type => type.matches.test(description));
  const selectedType = imageType || {
    file: 'seals.svg',
    alt: 'Illustration of a vacuum-pump spare component; confirm exact part by model',
    label: 'PUMP SPARE'
  };
  return {
    src: `assets/everest-spares/${selectedType.file}`,
    alt: selectedType.alt,
    label: selectedType.label,
    illustration: true
  };
};

const renderSpareParts = () => {
  if (!sparePartsList) return;
  const query = sparePartsSearch?.value.trim().toLowerCase() || '';
  filteredSpareParts = activeSparePartCatalog.filter(part => {
    const matchesCategory = sparePartFilter === 'all' || part.category === sparePartFilter;
    const matchesQuery = !query
      || part.partNumber.toLowerCase().includes(query)
        || part.model.toLowerCase().includes(query)
        || part.description.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  const pageCount = Math.ceil(filteredSpareParts.length / sparePartPageSize);
  sparePartPage = Math.min(Math.max(1, sparePartPage), Math.max(1, pageCount));
  const pageStart = (sparePartPage - 1) * sparePartPageSize;
  const pageItems = filteredSpareParts.slice(pageStart, pageStart + sparePartPageSize);
  const fragment = document.createDocumentFragment();

  pageItems.forEach(part => {
    const imageDetails = getCatalogPartImage(part);
    const card = document.createElement('article');
    const imageWrap = document.createElement('a');
    const image = document.createElement('img');
    const category = document.createElement('span');
    const content = document.createElement('div');
    const partNumber = document.createElement('span');
    const description = document.createElement('h4');
    const details = document.createElement('a');
    const enquiry = document.createElement('a');

    card.className = 'spare-part-card';
    card.dataset.sparePartNumber = part.partNumber;
    card.dataset.sparePartDescription = part.description;
    card.dataset.sparePartCategory = part.category;
    imageWrap.className = 'spare-part-image';
    const routeParameters = new URLSearchParams({
      view: 'spare-parts',
      brand: part.brand,
      'spare-part': part.id,
      description: part.description
    });
    imageWrap.href = `?${routeParameters.toString()}`;
    imageWrap.setAttribute('aria-label', `View complete details for ${part.description}`);
    image.src = imageDetails.src;
    image.alt = imageDetails.alt;
    if (imageDetails.fit === 'contain') image.classList.add('spare-part-image-contain');
    image.loading = 'lazy';
    category.className = 'spare-part-image-label';
    category.textContent = imageDetails.label;
    imageWrap.append(image, category);

    content.className = 'spare-part-content';
    partNumber.className = 'spare-part-number';
    partNumber.textContent = part.partNumber ? `PART NO. ${part.partNumber}` : 'PART NO. NOT PROVIDED';
    const model = document.createElement('span');
    model.className = 'spare-part-model';
    model.textContent = `MODEL: ${part.model}`;
    description.className = part.description ? 'spare-part-description' : 'spare-part-description spare-part-missing';
    description.textContent = part.description || 'Description not provided';
    details.className = 'spare-part-details';
    details.href = imageWrap.href;
    details.textContent = 'View complete details';
    enquiry.className = 'spare-part-enquiry';
    enquiry.href = '#contact';
    enquiry.dataset.productEnquiry = part.partNumber
      ? `Part number ${part.partNumber} — ${part.description || 'description not provided'}`
      : `${part.brand.toUpperCase()} spare — ${part.description}; model ${part.model}; part number not provided`;
    enquiry.append(document.createTextNode('Enquire about this part '));
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    enquiry.append(arrow);
    content.append(partNumber, model, description, details, enquiry);
    card.append(imageWrap, content);
    fragment.append(card);
  });

  sparePartsList.replaceChildren(fragment);
  if (sparePartsResults) {
    sparePartsResults.textContent = filteredSpareParts.length
      ? `Showing ${pageStart + 1}–${pageStart + pageItems.length} of ${filteredSpareParts.length} catalogue entries`
      : 'No matching parts';
  }
  if (sparePartsEmpty) sparePartsEmpty.hidden = filteredSpareParts.length > 0;
  if (sparePartsPagination) sparePartsPagination.hidden = pageCount <= 1;
  if (sparePartsPageLabel) sparePartsPageLabel.textContent = `Page ${sparePartPage} of ${Math.max(1, pageCount)}`;
  if (sparePartsPrevious) sparePartsPrevious.disabled = sparePartPage <= 1;
  if (sparePartsNext) sparePartsNext.disabled = sparePartPage >= pageCount;
};

if (sparePartsList) {
  renderSpareParts();
  sparePartsSearch?.addEventListener('input', () => {
    sparePartPage = 1;
    renderSpareParts();
  });
  sparePartFilters.forEach(button => {
    button.addEventListener('click', () => {
      sparePartFilter = button.dataset.spareFilter;
      sparePartPage = 1;
      sparePartFilters.forEach(filterButton => {
        const isActive = filterButton === button;
        filterButton.classList.toggle('is-active', isActive);
        filterButton.setAttribute('aria-pressed', String(isActive));
      });
      renderSpareParts();
    });
  });
  sparePartsPrevious?.addEventListener('click', () => {
    sparePartPage -= 1;
    renderSpareParts();
  });
  sparePartsNext?.addEventListener('click', () => {
    sparePartPage += 1;
    renderSpareParts();
  });
}

const sparePartDetailPage = document.getElementById('spare-part-detail-page');
const sparePartsPage = document.getElementById('spare-parts-section');
const sparePartsPageRequested = sparePartDetailParameters.get('view') === 'spare-parts';
const sparePartDetailNumber = sparePartDetailParameters.get('spare-part');
const requestedPartDescription = sparePartDetailParameters.get('description') || '';
const selectedSparePart = activeSparePartCatalog.find(item =>
  (item.id === sparePartDetailNumber || item.partNumber === sparePartDetailNumber)
    && item.description === requestedPartDescription
);
if (sparePartDetailPage && sparePartsPage && (sparePartsPageRequested || selectedSparePart)) {
  document.body.classList.add('spare-parts-route');
  const isEverestRoute = sparePartBrand === 'everest';
  const brandName = isEverestRoute ? 'EVEREST' : 'KAESER';
  const brandPartsLabel = `${brandName} ${isEverestRoute ? 'vacuum pump ' : ''}spare parts`;
  const homePageUrl = new URL(window.location.href);
  homePageUrl.search = '';
  homePageUrl.hash = '';
  document.querySelectorAll('.nav-links a[href^="#"], [data-spare-part-home]').forEach(link => {
    const target = link.getAttribute('href');
    if (target === '#spare-parts-section') {
      link.href = `${homePageUrl.pathname}?view=spare-parts${isEverestRoute ? '&brand=everest' : ''}#spare-parts-section`;
    } else if (target === '#products') {
      link.href = `${homePageUrl.pathname}?view=products#products`;
    } else {
      link.href = `${homePageUrl.pathname}${target}`;
    }
  });
  document.querySelectorAll('.nav-dropdown-menu [data-product-nav-filter]').forEach(link => {
    link.href = `${homePageUrl.pathname}#products`;
  });

  const brandBreadcrumb = document.getElementById('spare-part-brand-link');
  if (brandBreadcrumb) brandBreadcrumb.textContent = brandPartsLabel;
  document.getElementById('spare-parts-brand-breadcrumb').textContent = brandPartsLabel;
  document.getElementById('spare-parts-title').textContent = `${brandPartsLabel} catalogue`;
  document.getElementById('spare-parts-intro').textContent = isEverestRoute
    ? 'Browse the supplied EVEREST ESPH-150, ESPH-300, ESPH-300IH and ESPH-400 spares, with component illustrations matched to each description.'
    : 'Browse compressor service parts by image, part number and description. Search the catalogue or filter by part type.';
  document.getElementById('spare-parts-note').textContent = isEverestRoute
    ? 'Images are original component-type illustrations, not photographs of the exact supplied parts. Part numbers were not supplied; confirm the exact part number, model fit, dimensions, price and availability before ordering.'
    : 'Select a part to view its catalogue details on this website. KAESER photos are representative category images, not confirmed photos of each individual part. Compatibility and availability vary by compressor model; include equipment make, model and serial number with your enquiry.';
  if (isEverestRoute) {
    sparePartFilters.forEach(button => {
      button.hidden = !['all', 'filters', 'components'].includes(button.dataset.spareFilter);
      if (button.dataset.spareFilter === 'components') button.textContent = 'Other spares';
    });
  }

  const isDetailPage = Boolean(selectedSparePart);
  sparePartsPage.hidden = isDetailPage;
  sparePartDetailPage.hidden = !isDetailPage;
  if (selectedSparePart) {
    const part = selectedSparePart;
    const imageDetails = getCatalogPartImage(part);
    const categoryLabel = {
      filters: 'Filters',
      kits: 'Maintenance kits',
      fluids: 'Fluids & lubricants',
      components: 'Other components'
    }[part.category] || 'Other components';
    const pageTitle = part.description || `Part number ${part.partNumber}`;
    document.getElementById('spare-part-detail-breadcrumb').textContent = part.partNumber || part.description;
    const detailImage = document.getElementById('spare-part-detail-image');
    detailImage.src = imageDetails.src;
    detailImage.alt = imageDetails.alt;
    if (imageDetails.fit === 'contain') detailImage.classList.add('spare-part-image-contain');
    document.getElementById('spare-part-detail-image-label').textContent = imageDetails.label;
    document.getElementById('spare-part-detail-category').textContent = `${brandName} SPARE PARTS · ${categoryLabel.toUpperCase()}`;
    document.getElementById('spare-part-detail-title').textContent = pageTitle;
    document.getElementById('spare-part-detail-number').textContent = part.partNumber
      ? `PART NO. ${part.partNumber}`
      : 'PART NO. NOT PROVIDED';
    document.getElementById('spare-part-detail-intro').textContent = part.description
      ? `Catalogue information for ${part.description}.`
      : 'This part number was included without a description in the supplied catalogue.';
    document.getElementById('spare-part-detail-spec-number').textContent = part.partNumber || 'Not provided in the supplied list';
    document.getElementById('spare-part-detail-spec-model').textContent = part.model;
    document.getElementById('spare-part-detail-spec-description').textContent = part.description || 'Description not provided';
    document.getElementById('spare-part-detail-spec-category').textContent = categoryLabel;
    document.getElementById('spare-part-detail-image-note').textContent = isEverestRoute
      ? 'Component-type illustration matched to the description; not a photograph of this exact spare.'
      : 'Representative KAESER category reference; not confirmed as a photo of this exact part.';
    document.getElementById('spare-part-detail-note').textContent = isEverestRoute
      ? 'Confirm the exact part number and compatibility with the pump nameplate/model before ordering. Include the pump model and serial number with your enquiry.'
      : 'Compatibility, dimensions, price and availability must be confirmed for your equipment. Include the compressor make, model and serial number with your enquiry.';
    const enquiry = document.getElementById('spare-part-detail-enquiry');
    enquiry.dataset.productEnquiry = part.partNumber
      ? `Part number ${part.partNumber} — ${part.description || 'description not provided'}`
      : `${brandName} spare — ${part.description}; model ${part.model}; part number not provided`;

    document.title = `${pageTitle} | Aadya Engineering Equipment`;
  } else {
    document.title = `${brandPartsLabel} | Aadya Engineering Equipment`;
  }

  const activeRouteSection = isDetailPage ? sparePartDetailPage : sparePartsPage;
  Array.from(document.querySelector('main').children).forEach(section => {
    section.hidden = section !== activeRouteSection;
  });
}

const serviceDetailContent = {
  equipment: {
    eyebrow: 'INDUSTRIAL AIR · EQUIPMENT SELECTION',
    title: 'Air compressor solutions, selected for your operation.',
    intro: 'Find a compressor setup that matches your air demand, pressure, working pattern and site conditions. Aadya supports equipment selection and coordination from requirement review through supply planning.',
    image: 'assets/kaeser-card.webp',
    imageAlt: 'Industrial rotary screw air compressor in a plant room',
    floating: ['Air demand review', 'Application-led selection'],
    cta: 'Discuss compressor requirement',
    enquiry: 'Air compressor sales and equipment selection enquiry',
    highlights: ['Capacity & pressure review', 'System planning', 'Supply coordination'],
    overviewLabel: 'COMPRESSED AIR EQUIPMENT',
    overviewTitle: 'A better fit starts with understanding your air demand.',
    overviewCopy: 'Choosing equipment around actual site needs helps avoid a mismatched installation. Share your application and operating pattern so the options can be reviewed with the right context.',
    benefits: [
      ['01 / ASSESS', 'Understand your requirement', 'Review air flow, working pressure, operating hours, process demand and expansion plans.'],
      ['02 / SELECT', 'Compare suitable options', 'Discuss compressor type, capacity range, control approach and supporting air treatment based on the requirement.'],
      ['03 / PLAN', 'Coordinate the installation', 'Consider utilities, room layout, ventilation, air receiver, piping and commissioning requirements.']
    ],
    scopeTitle: 'What we review before recommending equipment',
    scopeCopy: 'A practical equipment discussion combines the process requirement with site conditions and future plans. Final model and performance are confirmed against manufacturer data and availability.',
    scopeNote: 'Exact models, capacity, pressure, power supply, efficiency and configuration depend on the application and current product availability.',
    scopeCta: 'Share your air requirement',
    checklist: [
      ['Air demand & pressure', 'Required flow, working pressure, demand variation and critical process needs.'],
      ['Operating pattern', 'Shift schedule, annual operating hours, load profile and standby expectations.'],
      ['Air quality & treatment', 'Required air quality and any filtration, drying or condensate management needs.'],
      ['Installation conditions', 'Available floor space, room ventilation, ambient conditions, utilities and access.'],
      ['Lifecycle support', 'Service access, planned maintenance, spare-parts needs and expansion considerations.']
    ],
    processTitle: 'From requirement to a considered proposal.',
    steps: [
      ['01', 'Tell us about the application', 'Share the process, flow, pressure and operating hours.'],
      ['02', 'Review the site context', 'Discuss installation, air quality, utilities and constraints.'],
      ['03', 'Evaluate options', 'Review an appropriate equipment arrangement and supporting components.'],
      ['04', 'Plan the next step', 'Confirm availability, scope, commercial terms and supply timeline.']
    ],
    faqs: [
      ['What details help size a compressor?', 'Air demand or flow, working pressure, operating hours, demand profile, air quality target and site conditions are useful starting points.'],
      ['Can you help with a complete compressor room?', 'A system discussion can include air treatment, receiver, condensate handling, piping and layout, subject to project scope.'],
      ['Do you provide an exact model and price online?', 'A suitable model and quotation depend on confirmed site requirements, manufacturer data and availability. Contact us for an application-specific review.']
    ],
    finalTitle: 'Let’s size the system around your application.',
    finalCopy: 'Send your air demand, pressure and site details to start an equipment discussion.'
  },
  parts: {
    eyebrow: 'EQUIPMENT LIFECYCLE · REPLACEMENT PARTS',
    title: 'The right spare part starts with the right equipment details.',
    intro: 'Get help identifying replacement parts for your compressor or vacuum pump. Share the machine make, model and serial number so the part requirement can be checked before ordering.',
    image: 'assets/compressor-parts.jpg',
    imageAlt: 'Industrial compressor service parts and replacement components',
    floating: ['Model-based enquiry', 'Parts identification'],
    cta: 'Ask about a spare part',
    enquiry: 'Industrial equipment spare-parts identification enquiry',
    highlights: ['Compressor spares', 'Vacuum pump spares', 'Part identification support'],
    overviewLabel: 'SPARES & SERVICE ITEMS',
    overviewTitle: 'Clear identification helps avoid incorrect part orders.',
    overviewCopy: 'A part description alone may not confirm compatibility. Model, serial number, equipment configuration and any part markings help the service team review the requirement accurately.',
    benefits: [
      ['01 / IDENTIFY', 'Use equipment information', 'Check the machine make, model and serial number along with the required component description.'],
      ['02 / VERIFY', 'Confirm the requirement', 'Cross-check available part markings, photos and maintenance context before preparing a quote.'],
      ['03 / SUPPORT', 'Plan maintenance needs', 'Discuss routine service items and replacement requirements for your installed equipment.']
    ],
    scopeTitle: 'What to share with your spare-parts enquiry',
    scopeCopy: 'Providing useful identification details helps us review the request and confirm next steps. Part number, price, lead time and compatibility are confirmed after checking the exact equipment.',
    scopeNote: 'Catalogue examples and images are references only. Availability, genuine-part status and model compatibility must be confirmed for each enquiry.',
    scopeCta: 'Send part details',
    checklist: [
      ['Equipment make & model', 'Include the brand, series and exact model shown on the equipment nameplate.'],
      ['Serial number', 'Share the serial number and, where possible, the year or configuration details.'],
      ['Part number or marking', 'Provide the existing part number, label, drawing reference or a clear photo if available.'],
      ['Part description & quantity', 'Describe the component, quantity required and any dimensions or connection details.'],
      ['Operating context', 'Mention the application, service history and any failure symptoms relevant to the request.']
    ],
    processTitle: 'A simple process for checking the part.',
    steps: [
      ['01', 'Send the details', 'Share the equipment nameplate and the part number or description.'],
      ['02', 'Review compatibility', 'We check the available references and confirm if more information is needed.'],
      ['03', 'Confirm the quote', 'Receive confirmed pricing, availability and lead time for the identified item.'],
      ['04', 'Coordinate supply', 'Proceed with the agreed item and delivery or service arrangements.']
    ],
    faqs: [
      ['Can I order using only a description?', 'A description can help start the search, but model and serial details are often needed to confirm fitment.'],
      ['Are all catalogue images exact part photos?', 'No. Some catalogue images are representative category references. The exact part and compatibility must be verified before an order.'],
      ['Can you help with KAESER and EVEREST spares?', 'Send the equipment make, model, serial number and part details. The specific part number and availability will be confirmed for your machine.']
    ],
    finalTitle: 'Need help identifying a component?',
    finalCopy: 'Send the nameplate and part information. We’ll review what is needed to confirm compatibility.',
    links: [
      ['Browse KAESER spare parts', '?view=spare-parts#spare-parts-section'],
      ['Browse EVEREST vacuum spares', '?view=spare-parts&brand=everest#spare-parts-section']
    ]
  },
  repairs: {
    eyebrow: 'FIELD SUPPORT · TROUBLESHOOTING',
    title: 'Service and repair support for essential plant equipment.',
    intro: 'When an air compressor or vacuum pump needs attention, share the symptoms and equipment details. Aadya can help coordinate an inspection, troubleshooting discussion and next-step repair proposal.',
    image: 'assets/service-technician.webp',
    imageAlt: 'Service technician inspecting industrial equipment',
    floating: ['Inspection-led support', 'Clear service findings'],
    cta: 'Request service support',
    enquiry: 'Industrial compressor or vacuum-pump service and repair request',
    highlights: ['Fault assessment', 'Maintenance support', 'Repair recommendations'],
    overviewLabel: 'SERVICE & REPAIRS',
    overviewTitle: 'Understand the issue before deciding the repair.',
    overviewCopy: 'Good troubleshooting starts with the machine history, operating symptoms and a safe inspection. The work scope and repair recommendations depend on equipment condition and findings.',
    benefits: [
      ['01 / INSPECT', 'Review operating symptoms', 'Capture alarms, pressure or vacuum changes, noises, leaks and recent operating events.'],
      ['02 / DIAGNOSE', 'Assess the equipment condition', 'Plan a suitable inspection and identify which checks or measurements are needed.'],
      ['03 / RESOLVE', 'Agree the corrective work', 'Review findings, repair options, required parts and the next service steps before proceeding.']
    ],
    scopeTitle: 'Support can be planned around the fault and equipment',
    scopeCopy: 'The service team will need clear equipment details and a description of the current issue. Any repair, parts, timing and site access requirements are agreed after assessment.',
    scopeNote: 'Service availability, response time, repair scope and parts are confirmed case-by-case; urgent response is not guaranteed unless expressly agreed.',
    scopeCta: 'Describe the equipment issue',
    checklist: [
      ['Equipment information', 'Make, model, serial number, location and approximate operating hours.'],
      ['Symptoms & alarms', 'Describe the fault, alarm code, pressure or vacuum readings, and when it occurs.'],
      ['Operating history', 'Mention recent service, replaced parts, process changes and how the machine is being used.'],
      ['Safe site access', 'Share site contact, access rules, isolation requirements and any safety constraints.'],
      ['Findings & repair plan', 'Review inspection findings, likely corrective actions, parts and a quotation before work begins.']
    ],
    processTitle: 'Clear steps from first report to repair plan.',
    steps: [
      ['01', 'Report the symptoms', 'Share the equipment details, alarm and operating conditions.'],
      ['02', 'Arrange an assessment', 'Agree suitable checks, access and service timing.'],
      ['03', 'Review the findings', 'Discuss observations, potential causes and recommended work.'],
      ['04', 'Approve next steps', 'Confirm quotation, parts and repair scope before proceeding.']
    ],
    faqs: [
      ['What should I do before requesting support?', 'Follow your site safety procedures. Record alarms and readings if safe to do so, and avoid operating equipment that presents a safety risk.'],
      ['Can a repair be diagnosed remotely?', 'Initial troubleshooting may help narrow down the issue, but an on-site inspection or additional measurements may be needed.'],
      ['Are parts and repair work included in an inspection?', 'Not automatically. The findings, parts, corrective work and charges will be outlined separately for approval.']
    ],
    finalTitle: 'Tell us what the equipment is doing.',
    finalCopy: 'Include the model, serial number, symptoms and any alarm information in your service request.'
  }
};

const serviceDetailPage = document.getElementById('service-detail-page');
const requestedService = new URLSearchParams(window.location.search);
if (requestedService.get('view') === 'quote') {
  document.body.classList.add('quote-route');
  const homePageUrl = new URL(window.location.href);
  homePageUrl.search = '';
  homePageUrl.hash = '';
  document.querySelectorAll('a[href^="#"]')
    .forEach(link => {
      link.href = `${homePageUrl.pathname}${link.getAttribute('href')}`;
    });
  document.title = 'Request a Quote | Aadya Engineering Equipment';
}
const serviceKey = requestedService.get('service');
const selectedService = serviceDetailContent[serviceKey];
const productsPage = document.getElementById('products');
if (productsPage && requestedService.get('view') === 'products') {
  document.body.classList.add('products-route');
  const homePageUrl = new URL(window.location.href);
  homePageUrl.search = '';
  homePageUrl.hash = '';
  document.querySelectorAll('.nav-links a[href^="#"], .footer-quick-links a[href^="#"]')
    .forEach(link => {
      link.href = `${homePageUrl.pathname}${link.getAttribute('href')}`;
    });
  Array.from(document.querySelector('main').children).forEach(section => {
    section.hidden = section !== productsPage;
  });
  document.title = 'Products Catalogue | Aadya Engineering Equipment';
}
const clientsMarqueeTrack = document.querySelector('[data-client-marquee-track]');
const clientLogoFiles = [
  'client-logo-01.jpeg', 'client-logo-02.jpeg', 'client-logo-03.jpeg', 'client-logo-04.png',
  'client-logo-05.jpeg', 'client-logo-06.jpeg', 'client-logo-07.jpeg', 'client-logo-08.jpeg',
  'client-logo-09.jpeg', 'client-logo-10.jpeg', 'client-logo-11.jpeg',
  'client-logo-13.jpeg', 'client-logo-14.jpeg', 'client-logo-15.png', 'client-logo-16.png',
  'client-logo-17.png', 'client-logo-18.jpeg', 'client-logo-19.jpeg', 'client-logo-20.jpeg',
  'client-logo-21.jpeg', 'client-logo-22.jpeg', 'client-logo-23.jpeg', 'client-logo-24.png',
  'client-logo-25.jpeg', 'client-logo-26.jpeg', 'client-logo-27.jpeg', 'client-logo-28.jpeg',
  'client-logo-29.png', 'client-logo-30.jpeg', 'client-logo-31.jpeg', 'client-logo-32.jpeg',
  'client-logo-33.jpeg', 'client-logo-34.jpeg', 'client-logo-35.jpeg', 'client-logo-36.jpeg',
  'client-logo-37.jpeg', 'client-logo-38.jpeg', 'client-logo-39.png', 'client-logo-40.jpeg',
  'client-logo-41.png', 'client-logo-42.png', 'client-logo-43.jpeg', 'client-logo-44.jpeg',
  'client-logo-45.jpeg', 'client-logo-46.jpeg', 'client-logo-47.jpeg'
];
const clientProfiles = [
  { name: 'Bisleri', description: 'An Indian packaged-water and beverage brand.', source: 'https://www.bisleri.com/' },
  { name: 'Asian Paints', description: 'An Indian paint and coatings maker whose portfolio also includes home-decor products and services.', source: 'https://www.asianpaints.com/about-us.html' },
  { name: 'Orient Cement', description: 'A cement manufacturer within the CK Birla Group.', source: 'https://orientcement.com/' },
  { name: 'GTN Industries', description: 'A textile company associated with cotton yarn and spinning.', source: 'https://www.gtnindustries.com/' },
  { name: 'Yokohama', description: 'A tyre manufacturer; Yokohama India offers tyres for cars and SUVs.', source: 'https://www.yokohama-india.com/' },
  { name: 'Greenply', description: 'An Indian interior-materials company producing plywood, veneers and MDF boards.', source: 'https://www.greenply.com/about-us' },
  { name: 'Kumar Pumps & Motors', description: 'The logo identifies this name and describes the business as pumps and motors. Further company details could not be independently confirmed.' },
  { name: 'ORCH Laboratories India Pvt Ltd', description: 'The logo identifies this name, but the company’s business and current legal identity could not be confirmed from a reliable public source.' },
  { name: 'LG Chem / LG Polymers India Pvt Ltd', description: 'LG Chem is a chemicals and materials company. The logo also names LG Polymers India; a current relationship between the entities has not been confirmed.', source: 'https://www.lgchem.com/' },
  { name: 'Larsen & Toubro (L&T)', description: 'An Indian engineering and construction group with businesses spanning infrastructure, manufacturing and services.', source: 'https://www.larsentoubro.com/corporate/about-lt-group/' },
  { name: 'Coca-Cola', description: 'A beverage company with products and operations in India.', source: 'https://www.coca-cola.com/in/en/about-us' },
  { name: 'Laurus Labs', description: 'A pharmaceutical and life-sciences company.', source: 'https://www.lauruslabs.com/' },
  { name: 'Sree Rayalaseema Alkali & Allied Chemicals Ltd.', description: 'The logo identifies this company name; its business details could not be independently confirmed from a reliable source.' },
  { name: 'Hetero', description: 'A pharmaceutical company focused on APIs, generics, biosimilars and custom pharmaceutical services.', source: 'https://www.hetero.com/about-us' },
  { name: 'Sionc Pharmaceuticals Pvt Ltd', description: 'The logo identifies this name, but a reliable current company profile could not be confirmed.' },
  { name: 'Bharat Heavy Electricals Limited (BHEL)', description: 'A public-sector engineering and capital-goods company serving sectors including power, transport and defence.', source: 'https://www.bhel.com/about-us' },
  { name: 'The Hindu', description: 'An Indian English-language newspaper and digital news publication.', source: 'https://www.thehindu.com/aboutus/' },
  { name: 'Synergies Castings Limited', description: 'The logo identifies a castings company; more specific product details could not be confirmed from an accessible reliable source.' },
  { name: 'Santhoshimatha Edible Oil Refineries Pvt Ltd (Priya Gold)', description: 'The logo shows this refinery name together with the “Priya Gold” mark. Products and current legal details have not been independently confirmed.' },
  { name: 'Johnson Pedder', description: 'The logo displays the Johnson Pedder name and the tagline “The smarter choice.” Its product category could not be confirmed from an accessible company profile.', source: 'https://www.johnsonpedder.com/' },
  { name: 'Alufluoride Ltd', description: 'An Indian producer of aluminium fluoride.', source: 'https://www.alufluoride.com/' },
  { name: 'Metalotec', description: 'The name is legible in the logo, but the company’s business and legal identity could not be independently confirmed.' },
  { name: 'Pidilite', description: 'An Indian consumer and industrial products company known for adhesives and related products.', source: 'https://www.pidilite.com/' },
  { name: 'SPPL (unverified identity)', description: 'The logo shows the initials “SPPL.” The specific organization represented could not be confidently identified.' },
  { name: 'Eenadu', description: 'A Telugu-language news publication.', source: 'https://www.eenadu.net/' },
  { name: 'Double Horse', description: 'A food brand associated with Manjilas; its public website presents a range of food products.', source: 'https://www.doublehorse.in/' },
  { name: 'CPF (unverified identity)', description: 'The logo displays “CPF,” but the organization represented by this particular mark could not be confirmed. It should not be assumed to be Charoen Pokphand Foods.' },
  { name: 'Adani Group', description: 'A diversified Indian group with businesses including transport and utility infrastructure.', source: 'https://www.adani.com/about-us' },
  { name: 'Deccan Fine Chemicals', description: 'The logo identifies a chemicals company; a current authoritative profile with more specific details could not be confirmed.' },
  { name: 'Hindustan Shipyard Ltd', description: 'The logo identifies Hindustan Shipyard Ltd. Further details could not be verified from an accessible authoritative company profile.', source: 'https://hslvizag.in/' },
  { name: 'Indian Navy', description: 'The naval service of India.', source: 'https://www.joinindiannavy.gov.in/' },
  { name: 'Lee Pharma Ltd', description: 'A pharmaceutical manufacturer whose website describes APIs, formulations and contract manufacturing.', source: 'https://www.leepharma.com/' },
  { name: 'Granules India Ltd', description: 'A pharmaceutical manufacturer with a portfolio spanning APIs, pharmaceutical intermediates and finished dosage forms.', source: 'https://www.granulesindia.com/' },
  { name: 'North Coastal Integrated Food Park', description: 'The logo identifies a food park by this name; its current operating status and facilities could not be confirmed from an authoritative public profile.' },
  { name: 'KCP Cement', description: 'The logo identifies the KCP Cement brand; further cement-specific details could not be confirmed from a current company source.', source: 'https://www.kcp.co.in/' },
  { name: 'Queen’s NRI Hospital', description: 'A multispecialty hospital in Vizianagaram, Andhra Pradesh.', source: 'https://www.queensnrihospital.com/' },
  { name: 'LIXIL', description: 'A global company making water and housing products.', source: 'https://www.lixil.com/' },
  { name: 'MYAN Group', description: 'The logo reads “MYAN Group” and includes an “Infrastructure & Asset Development” tagline. The legal entity and business details could not be independently verified.' },
  { name: 'Sakshi', description: 'A Telugu-language news publication. The logo reads “సాక్షి” (Sakshi).', source: 'https://www.sakshi.com/' },
  { name: 'Saint-Gobain', description: 'A materials company associated with construction and building products.', source: 'https://www.saint-gobain.com/en' },
  { name: 'ITC Limited', description: 'A diversified Indian company with businesses across consumer goods, hotels, paperboards and packaging, and agriculture.', source: 'https://www.itcportal.com/about-itc.html' },
  { name: 'Smilax Laboratories Ltd', description: 'A pharmaceutical company producing APIs and related products.', source: 'https://smilaxlabs.com/' },
  { name: 'Nagarjuna Group', description: 'The logo identifies the group name but not a specific group company or business; no sector details have been verified.', source: 'https://nagarjunagroup.com/' },
  { name: 'MRF', description: 'An Indian tyre maker; the face-and-tyre illustration is the MRF mark.', source: 'https://www.mrftyres.com/' },
  { name: 'Mahindra', description: 'The logo identifies the Mahindra group brand, which spans multiple businesses; it does not identify a specific subsidiary.', source: 'https://www.mahindra.com/about-us' },
  { name: 'Hindware / HSIL', description: 'The logo combines the Hindware and HSIL marks. It does not by itself establish the current legal entity or corporate relationship represented.', source: 'https://www.hindware.com/' }
];

if (clientsMarqueeTrack) {
  const clientLogoGroup = document.createElement('div');
  clientLogoGroup.className = 'clients-marquee-group';
  clientLogoGroup.setAttribute('role', 'list');
  clientLogoGroup.setAttribute('aria-label', 'Client logos from company profile page 7');

  clientLogoFiles.forEach((fileName, index) => {
    const profile = clientProfiles[index];
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'clients-marquee-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', `Show all client logos, including ${profile?.name || `logo ${index + 1}`}`);
    const imageFrame = document.createElement('div');
    imageFrame.className = 'clients-logo-frame';
    const image = document.createElement('img');
    image.src = `assets/clients/${fileName}`;
    image.alt = `${profile?.name || `Client ${index + 1}`} logo`;
    image.dataset.adminClientLogo = fileName;
    image.loading = 'eager';
    image.decoding = 'async';
    imageFrame.append(image);
    card.append(imageFrame);
    clientLogoGroup.append(card);
  });

  const repeatedClientLogoGroup = clientLogoGroup.cloneNode(true);
  repeatedClientLogoGroup.removeAttribute('role');
  repeatedClientLogoGroup.removeAttribute('aria-label');
  repeatedClientLogoGroup.setAttribute('aria-hidden', 'true');
  repeatedClientLogoGroup.querySelectorAll('button').forEach(button => {
    button.disabled = true;
  });
  repeatedClientLogoGroup.querySelectorAll('img').forEach(image => {
    image.alt = '';
    image.loading = 'lazy';
  });
  clientsMarqueeTrack.replaceChildren(clientLogoGroup, repeatedClientLogoGroup);
}

const clientsGalleryDialog = document.getElementById('clients-gallery-dialog');
const clientsGalleryGrid = document.getElementById('clients-gallery-grid');
const clientsGalleryClose = clientsGalleryDialog?.querySelector('.clients-gallery-close');
const clientsGalleryBack = document.getElementById('clients-gallery-back');
const clientsGalleryTitle = document.getElementById('clients-gallery-title');
const clientsGalleryDetail = document.getElementById('clients-gallery-detail');
const clientsDetailImage = document.getElementById('clients-detail-image');
const clientsDetailName = document.getElementById('clients-detail-name');
const clientsDetailDescription = document.getElementById('clients-detail-description');
const clientsDetailSource = document.getElementById('clients-detail-source');
if (clientsMarqueeTrack && clientsGalleryDialog instanceof HTMLDialogElement
  && clientsGalleryGrid && clientsGalleryClose && clientsGalleryBack && clientsGalleryTitle
  && clientsGalleryDetail && clientsDetailImage && clientsDetailName
  && clientsDetailDescription && clientsDetailSource) {
  const galleryGroup = document.createElement('div');
  galleryGroup.className = 'clients-gallery-group';
  galleryGroup.setAttribute('role', 'list');
  let selectedGalleryCard = null;
  let suppressGalleryFocusOpen = false;

  const showClientList = () => {
    clientsGalleryGrid.hidden = false;
    clientsGalleryDetail.hidden = true;
    clientsGalleryBack.hidden = true;
    clientsGalleryTitle.textContent = 'Our All Clients';
  };
  const closeClientsGallery = () => {
    suppressGalleryFocusOpen = true;
    clientsGalleryDialog.close();
    requestAnimationFrame(() => { suppressGalleryFocusOpen = false; });
  };
  clientLogoFiles.forEach((fileName, index) => {
    const profile = clientProfiles[index];
    if (!profile) return;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'clients-gallery-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', `View ${profile.name} profile`);
    const frame = document.createElement('div');
    frame.className = 'clients-gallery-logo-frame';
    const image = document.createElement('img');
    image.src = `assets/clients/${fileName}`;
    image.alt = `${profile.name} logo`;
    image.dataset.adminClientLogo = fileName;
    image.loading = 'lazy';
    image.decoding = 'async';
    frame.append(image);
    card.append(frame);
    galleryGroup.append(card);
  });
  clientsGalleryGrid.replaceChildren(galleryGroup);

  const openClientsGallery = () => {
    if (!clientsGalleryDialog.open) {
      showClientList();
      clientsGalleryDialog.showModal();
    }
  };
  clientsGalleryGrid.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const card = event.target.closest('.clients-gallery-card');
    if (!card) return;
    const index = Array.from(galleryGroup.children).indexOf(card);
    const profile = clientProfiles[index];
    const fileName = clientLogoFiles[index];
    if (!profile || !fileName) return;
    selectedGalleryCard = card;
    clientsDetailImage.src = `assets/clients/${fileName}`;
    clientsDetailImage.alt = `${profile.name} logo`;
    clientsDetailName.textContent = profile.name;
    clientsDetailDescription.textContent = profile.description;
    clientsDetailSource.hidden = !profile.source;
    if (profile.source) clientsDetailSource.href = profile.source;
    clientsGalleryGrid.hidden = true;
    clientsGalleryDetail.hidden = false;
    clientsGalleryBack.hidden = false;
    clientsGalleryTitle.textContent = profile.name;
    clientsGalleryBack.focus();
  });
  clientsGalleryBack.addEventListener('click', () => {
    showClientList();
    selectedGalleryCard?.focus();
  });
  clientsMarqueeTrack.addEventListener('pointerover', event => {
    if (!(event.target instanceof Element)) return;
    const card = event.target.closest('.clients-marquee-card');
    if (!card || card.closest('[aria-hidden="true"]')
      || (event.relatedTarget instanceof Node && card.contains(event.relatedTarget))) return;
    openClientsGallery();
  });
  clientsMarqueeTrack.addEventListener('focusin', () => {
    if (!suppressGalleryFocusOpen) openClientsGallery();
  });
  clientsGalleryDialog.addEventListener('close', showClientList);
  clientsGalleryDialog.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeClientsGallery();
  });
  clientsGalleryDialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeClientsGallery();
  });
  clientsGalleryClose.addEventListener('click', closeClientsGallery);
  clientsGalleryDialog.addEventListener('click', event => {
    if (event.target === clientsGalleryDialog) closeClientsGallery();
  });
}

const clientsPage = document.getElementById('clients-page');
if (clientsPage && requestedService.get('view') === 'clients') {
  document.body.classList.add('clients-route');
  const homePageUrl = new URL(window.location.href);
  homePageUrl.search = '';
  homePageUrl.hash = '';
  document.querySelectorAll('.nav-links a[href^="#"], .footer-quick-links a[href^="#"]')
    .forEach(link => {
      link.href = `${homePageUrl.pathname}${link.getAttribute('href')}`;
    });
  Array.from(document.querySelector('main').children).forEach(section => {
    section.hidden = section !== clientsPage;
  });
  document.title = 'Clients & Partners | Aadya Engineering Equipment';
}
if (serviceDetailPage && requestedService.get('view') === 'service' && selectedService) {
  document.body.classList.add('service-detail-route');
  const homePageUrl = new URL(window.location.href);
  homePageUrl.search = '';
  homePageUrl.hash = '';
  document.querySelectorAll('.nav-links a[href^="#"], .service-detail-back').forEach(link => {
    link.href = `${homePageUrl.pathname}${link.getAttribute('href')}`;
  });
  document.querySelectorAll('.nav-dropdown-menu [data-product-nav-filter]').forEach(link => {
    link.href = `${homePageUrl.pathname}#products`;
  });
  const setText = (selector, value) => {
    const element = serviceDetailPage.querySelector(selector);
    if (element) element.textContent = value;
  };
  const renderCards = (selector, items, className, createMarkup, tagName = 'article') => {
    const container = serviceDetailPage.querySelector(selector);
    if (!container) return;
    const fragment = document.createDocumentFragment();
    items.forEach((item, index) => {
      const card = document.createElement(tagName);
      card.className = className;
      createMarkup(card, item, index);
      fragment.append(card);
    });
    container.replaceChildren(fragment);
  };

  setText('#service-detail-eyebrow', selectedService.eyebrow);
  setText('#service-detail-title', selectedService.title);
  setText('#service-detail-intro', selectedService.intro);
  setText('#service-detail-cta-label', selectedService.cta);
  setText('#service-detail-float-one', selectedService.floating[0]);
  setText('#service-detail-float-two', selectedService.floating[1]);
  setText('#service-detail-overview-label', selectedService.overviewLabel);
  setText('#service-detail-overview-title', selectedService.overviewTitle);
  setText('#service-detail-overview-copy', selectedService.overviewCopy);
  setText('#service-detail-scope-title', selectedService.scopeTitle);
  setText('#service-detail-scope-copy', selectedService.scopeCopy);
  setText('#service-detail-scope-note', selectedService.scopeNote);
  setText('#service-detail-scope-cta-label', selectedService.scopeCta);
  setText('#service-detail-process-title', selectedService.processTitle);
  setText('#service-detail-final-title', selectedService.finalTitle);
  setText('#service-detail-final-copy', selectedService.finalCopy);
  setText('#service-detail-final-cta-label', selectedService.cta);
  serviceDetailPage.querySelector('h2 em').textContent = 'answered.';
  const heroImage = serviceDetailPage.querySelector('#service-detail-image');
  heroImage.src = selectedService.image;
  heroImage.alt = selectedService.imageAlt;
  const mainCta = serviceDetailPage.querySelector('#service-detail-cta');
  const scopeCta = serviceDetailPage.querySelector('#service-detail-scope-cta');
  const finalCta = serviceDetailPage.querySelector('#service-detail-final-cta');
  [mainCta, scopeCta, finalCta].forEach(link => {
    link.dataset.productEnquiry = selectedService.enquiry;
  });
  const highlightContainer = serviceDetailPage.querySelector('#service-detail-highlights');
  selectedService.highlights.forEach((highlight, index) => {
    const item = document.createElement('span');
    const number = document.createElement('b');
    number.textContent = `0${index + 1}`;
    item.append(number, document.createTextNode(highlight));
    highlightContainer.append(item);
  });
  renderCards('#service-detail-benefits', selectedService.benefits, 'service-detail-benefit-card', (card, item, index) => {
    const number = document.createElement('span');
    number.className = 'service-detail-card-index';
    number.textContent = item[0];
    const title = document.createElement('h3');
    title.textContent = item[1];
    const copy = document.createElement('p');
    copy.textContent = item[2];
    card.classList.add(`service-detail-accent-${index + 1}`);
    card.append(number, title, copy);
  });
  renderCards('#service-detail-checklist', selectedService.checklist, 'service-detail-check-item', (card, item, index) => {
    const icon = document.createElement('span');
    icon.className = 'service-detail-check-icon';
    icon.textContent = '✓';
    const copy = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = item[0];
    const description = document.createElement('p');
    description.textContent = item[1];
    copy.append(title, description);
    const number = document.createElement('b');
    number.textContent = `0${index + 1}`;
    card.append(icon, copy, number);
  });
  renderCards('#service-detail-steps', selectedService.steps, 'service-detail-step-card', (card, item) => {
    const number = document.createElement('span');
    number.textContent = item[0];
    const title = document.createElement('h3');
    title.textContent = item[1];
    const description = document.createElement('p');
    description.textContent = item[2];
    card.append(number, title, description);
  });
  renderCards('#service-detail-faq', selectedService.faqs, 'service-detail-faq-item', (card, item) => {
    const question = document.createElement('summary');
    question.textContent = item[0];
    const marker = document.createElement('span');
    marker.textContent = '+';
    question.append(marker);
    const answer = document.createElement('p');
    answer.textContent = item[1];
    card.append(question, answer);
  }, 'details');
  if (selectedService.links) {
    const linksContainer = document.createElement('div');
    linksContainer.className = 'service-detail-related-links';
    selectedService.links.forEach(([label, href]) => {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = label;
      linksContainer.append(link);
    });
    serviceDetailPage.querySelector('.service-detail-scope-copy').append(linksContainer);
  }
  Array.from(document.querySelector('main').children).forEach(section => {
    section.hidden = section !== serviceDetailPage;
  });
  document.title = `${serviceKey === 'equipment' ? 'Air Compressor Sales' : serviceKey === 'parts' ? 'Spare Parts' : 'Service & Repairs'} | Aadya Engineering Equipment`;
}

const amcDetailPage = document.getElementById('amc-detail-page');
if (amcDetailPage && sparePartDetailParameters.get('view') === 'amc') {
  document.body.classList.add('amc-route');
  const homePageUrl = new URL(window.location.href);
  homePageUrl.search = '';
  homePageUrl.hash = '';
  document.querySelectorAll('.nav-links a[href^="#"]').forEach(link => {
    link.href = `${homePageUrl.pathname}${link.getAttribute('href')}`;
  });
  amcDetailPage.querySelectorAll('.amc-back-link[href^="#"]').forEach(link => {
    link.href = `${homePageUrl.pathname}${link.getAttribute('href')}`;
  });
  Array.from(document.querySelector('main').children).forEach(section => {
    section.hidden = section !== amcDetailPage;
  });
  document.title = 'Annual Maintenance Contract (AMC) | Aadya Engineering Equipment';
}

const teamPage = document.getElementById('team-page');
if (teamPage && sparePartDetailParameters.get('view') === 'team') {
  document.body.classList.add('team-route');
  const homePageUrl = new URL(window.location.href);
  homePageUrl.search = '';
  homePageUrl.hash = '';
  document.querySelectorAll('.nav-links a[href^="#"], .footer-quick-links a[href^="#"], .team-back-link')
    .forEach(link => {
      link.href = `${homePageUrl.pathname}${link.getAttribute('href')}`;
    });
  Array.from(document.querySelector('main').children).forEach(section => {
    section.hidden = section !== teamPage;
  });
  document.title = 'Our Team & Careers | Aadya Engineering Equipment';
}

const amcProposalDialog = document.getElementById('amc-proposal-dialog');
const amcProposalSlot = document.getElementById('amc-proposal-form-slot');
const amcProposalClose = amcProposalDialog?.querySelector('.amc-proposal-close');
const serviceEnquiryDialogEyebrow = document.getElementById('service-enquiry-dialog-eyebrow');
const serviceEnquiryDialogTitle = document.getElementById('amc-proposal-dialog-title');
const serviceEnquiryDialogCopy = document.getElementById('service-enquiry-dialog-copy');
const enquiryForm = document.getElementById('enquiry-form');
const enquiryMessage = enquiryForm?.querySelector('textarea[name="message"]');
const enquiryService = enquiryForm?.querySelector('select[name="service"]');
const enquiryLineFor = productName => `Product enquiry: ${productName}`;
const prepareEnquiryForm = (productName, serviceType) => {
  if (!enquiryForm || !productName) return;
  const enquiryLine = enquiryLineFor(productName);
  if (enquiryMessage && !enquiryMessage.value.includes(enquiryLine)) {
    const prompt = /career|team application/i.test(productName)
      ? 'Please share the career area you are interested in, your relevant experience, and how we can contact you.'
      : 'Please share product details and a quotation.';
    enquiryMessage.value = enquiryMessage.value.trim()
      ? `${enquiryMessage.value.trim()}\n\n${enquiryLine}`
      : `${enquiryLine}\n${prompt}`;
  }
  const serviceLabel = serviceType || (/AMC|Annual Maintenance Contract/i.test(productName)
    ? 'AMC / preventive maintenance'
    : '');
  if (enquiryService && serviceLabel) {
    const serviceOption = Array.from(enquiryService.options)
      .find(option => option.textContent.trim() === serviceLabel);
    if (serviceOption) enquiryService.value = serviceOption.value || serviceOption.textContent;
  }
};
if (amcProposalDialog instanceof HTMLDialogElement && amcProposalSlot && enquiryForm && amcProposalClose) {
  document.body.append(amcProposalDialog);
  const originalFormParent = enquiryForm.parentElement;
  const originalFormNextSibling = enquiryForm.nextSibling;
  let formWasVisible = false;
  let previousPageOverflow = '';
  let previousBodyOverflow = '';
  const openProposalDialog = (productName, serviceType) => {
    const isAmc = document.body.classList.contains('amc-route');
    const isTeam = document.body.classList.contains('team-route');
    if (serviceEnquiryDialogEyebrow) {
      serviceEnquiryDialogEyebrow.lastChild.textContent = isTeam
        ? ' CAREER INTEREST'
        : isAmc ? ' AMC PROPOSAL REQUEST' : ' SERVICE ENQUIRY';
    }
    if (serviceEnquiryDialogTitle) {
      serviceEnquiryDialogTitle.textContent = isTeam
        ? 'Tell us about your experience.'
        : isAmc ? 'Tell us about your equipment.' : 'Tell us about your requirement.';
    }
    if (serviceEnquiryDialogCopy) {
      serviceEnquiryDialogCopy.textContent = isTeam
        ? 'Share the career area you are interested in, your experience and contact details. Our team will follow up if a suitable opportunity is available.'
        : isAmc
          ? 'Share your contact and machine details. The AMC team can then discuss a suitable service scope with you.'
          : 'Share your contact and equipment details. Our team will follow up to discuss the right next step.';
    }
    prepareEnquiryForm(productName, serviceType);
    formWasVisible = enquiryForm.classList.contains('is-visible');
    enquiryForm.classList.add('is-visible');
    amcProposalSlot.append(enquiryForm);
    previousPageOverflow = document.documentElement.style.overflow;
    previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('enquiry-dialog-open');
    amcProposalDialog.showModal();
  };
  const restoreEnquiryForm = () => {
    document.documentElement.style.overflow = previousPageOverflow;
    document.body.style.overflow = previousBodyOverflow;
    document.body.classList.remove('enquiry-dialog-open');
    if (originalFormParent && enquiryForm.parentElement !== originalFormParent) {
      originalFormParent.insertBefore(enquiryForm, originalFormNextSibling);
    }
    if (!formWasVisible) enquiryForm.classList.remove('is-visible');
  };
  amcProposalClose.addEventListener('click', () => amcProposalDialog.close());
  amcProposalDialog.addEventListener('close', restoreEnquiryForm);
  amcProposalDialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      amcProposalDialog.close();
    }
  });
  amcProposalDialog.addEventListener('click', event => {
    if (event.target === amcProposalDialog) amcProposalDialog.close();
  });
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('[data-product-enquiry]');
    if (!link || !document.body.matches('.service-detail-route, .amc-route, .team-route')) return;
    const serviceType = document.body.classList.contains('team-route')
      ? 'Other enquiry'
      : document.body.classList.contains('amc-route')
        ? 'AMC / preventive maintenance'
        : ({
          equipment: 'Compressor sales',
          parts: 'Spare parts',
          repairs: 'Service & repairs'
        })[serviceKey];
    event.preventDefault();
    openProposalDialog(link.dataset.productEnquiry, serviceType);
  });
}

const productDetailContent = {
  'kaeser-compressors': {
    intro: 'Rotary screw compressors provide a continuous source of compressed air for production and plant utilities. Aadya can help review your air demand and shortlist a suitable KAESER solution.',
    features: [
      'Selection based on required air flow, working pressure and operating hours.',
      'Options can be reviewed for fixed-speed or variable-speed operation, subject to model availability.',
      'System planning may consider air storage, treatment and condensate management.',
      'Installation, commissioning coordination, maintenance and service support are available.'
    ],
    note: 'Exact models, capacity, pressure, power supply and configuration are confirmed against your application and current product availability.'
  },
  'air-system-packages': {
    intro: 'A compressed-air room is a complete system, not just a compressor. We can help coordinate equipment around your air-quality target, demand profile and site layout.',
    features: [
      'Compressor selection and system arrangement based on the operating requirement.',
      'Air treatment may include dryers and filtration selected for the required air quality.',
      'Air receivers, condensate handling and connection requirements can be reviewed.',
      'Layout and installation coordination help bring the system components together.'
    ],
    note: 'Package contents and performance depend on the application. Final equipment selection and technical specifications are confirmed during enquiry.'
  },
  'everest-vacuum': {
    intro: 'EVEREST rotary vane vacuum pumps are designed for industrial vacuum duties. Aadya can help match a pump option to the required vacuum level, flow and process conditions.',
    features: [
      'Rotary vane vacuum pump options for industrial applications.',
      'Selection guided by required vacuum level, pumping speed and duty cycle.',
      'Process gas, ambient conditions and installation environment can be considered.',
      'Spare parts and maintenance support can be discussed for the selected equipment.'
    ],
    note: 'The pictured pump is representative of the product range. Confirm the exact model, vacuum performance, motor and suitability for your process before ordering.'
  },
  'compressor-parts': {
    intro: 'Correctly matched service parts help support routine compressor maintenance. Share the compressor make, model and nameplate details so we can help check part compatibility.',
    features: [
      'Air, oil and intake filter elements, depending on equipment design.',
      'Separators, service kits and other maintenance components where applicable.',
      'Part identification using equipment model, serial number or existing part number.',
      'Support with planned service requirements and replacement intervals.'
    ],
    note: 'Parts are equipment-specific. Availability, brand, part number and compatibility must be confirmed against the compressor before purchase.'
  },
  'industrial-doors': {
    intro: 'Industrial door and loading-bay equipment helps organize access between a facility and its loading areas. Aadya can coordinate product selection around the building and site requirements.',
    features: [
      'Options may include sectional, high-speed or rolling doors, subject to project scope.',
      'Loading-bay requirements such as dock levellers and accessories can be reviewed.',
      'Opening dimensions, usage frequency and building conditions inform selection.',
      'Product specification and installation coordination can be discussed for the project.'
    ],
    note: 'Available products, fire ratings, sizes and performance depend on the project and manufacturer specification. Site measurements and requirements are needed for a proposal.'
  },
  'compressed-air-piping': {
    intro: 'A well-planned distribution network carries compressed air from the plant room to points of use. SHIFTAIR piping solutions can be considered for new layouts and facility requirements.',
    features: [
      'Piping, fittings and connection components for compressed-air distribution.',
      'Layout planning around equipment locations and production points.',
      'System sizing review based on air demand, pressure and route length.',
      'Installation coordination and future expansion needs can be considered.'
    ],
    note: 'Final pipe sizes, material, pressure rating and layout depend on site conditions and engineering review.'
  }
};

const productDetailDialog = document.getElementById('product-detail-dialog');
const productDetailClose = productDetailDialog?.querySelector('.product-detail-close');
const productDetailImage = document.getElementById('product-detail-image');
const productDetailBadge = document.getElementById('product-detail-badge');
const productDetailCategory = document.getElementById('product-detail-category');
const productDetailTitle = document.getElementById('product-detail-title');
const productDetailIntro = document.getElementById('product-detail-intro');
const productDetailFeatures = document.getElementById('product-detail-features');
const productDetailNote = document.getElementById('product-detail-note');
const productDetailEnquiry = document.getElementById('product-detail-enquiry');

if (productDetailDialog instanceof HTMLDialogElement
  && productDetailClose
  && productDetailImage
  && productDetailBadge
  && productDetailCategory
  && productDetailTitle
  && productDetailIntro
  && productDetailFeatures
  && productDetailNote
  && productDetailEnquiry) {
  const openProductDetails = productId => {
    const product = productDetailContent[productId];
    const card = productCards.find(item => item.dataset.productId === productId);
    if (!product || !card) return;

    const image = card.querySelector('.product-image img');
    const badge = card.querySelector('.product-badge');
    const category = card.querySelector('.product-category');
    const title = card.querySelector('h3');
    if (!image || !badge || !category || !title) return;

    productDetailImage.src = image.currentSrc || image.src;
    productDetailImage.alt = image.alt;
    productDetailBadge.textContent = badge.textContent;
    productDetailCategory.textContent = category.textContent;
    productDetailTitle.textContent = title.textContent;
    productDetailIntro.textContent = product.intro;
    productDetailNote.textContent = product.note;
    productDetailFeatures.replaceChildren(...product.features.map(feature => {
      const item = document.createElement('li');
      item.textContent = feature;
      return item;
    }));
    productDetailEnquiry.dataset.productEnquiry = title.textContent;
    productDetailDialog.showModal();
  };

  document.querySelectorAll('[data-product-open]').forEach(button => {
    button.addEventListener('click', () => openProductDetails(button.dataset.productOpen));
  });
  productDetailClose.addEventListener('click', () => productDetailDialog.close());
  productDetailEnquiry.addEventListener('click', () => productDetailDialog.close());
  productDetailDialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      productDetailDialog.close();
    }
  });
  productDetailDialog.addEventListener('click', event => {
    if (event.target === productDetailDialog) productDetailDialog.close();
  });
}

document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest('[data-product-enquiry]');
  if (!link) return;
  const productName = link.dataset.productEnquiry;
  if (!productName) return;
  if (document.body.matches('.service-detail-route, .amc-route, .team-route') && amcProposalDialog?.open) return;
  if (document.body.matches('.service-detail-route, .amc-route, .spare-parts-route')) {
    event.preventDefault();
    const contactUrl = new URL(window.location.href);
    contactUrl.search = '';
    contactUrl.searchParams.set('enquiry', productName);
    contactUrl.hash = 'contact';
    window.location.href = contactUrl.toString();
    return;
  }
  prepareEnquiryForm(productName);
});

const enquiryFromUrl = new URLSearchParams(window.location.search).get('enquiry');
if (enquiryFromUrl && enquiryMessage) {
  prepareEnquiryForm(enquiryFromUrl);
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('enquiry');
  window.history.replaceState({}, '', cleanUrl);
}

// Current year in footer
const yearElement = document.getElementById('year');
if (yearElement) yearElement.textContent = new Date().getFullYear();

// Keep the floating contact shortcuts usable with both pointer and keyboard input.
const contactShortcut = document.querySelector('.footer-contact-shortcut');
const contactShortcutToggle = contactShortcut?.querySelector('.contact-shortcut-toggle');
const contactShortcutMenu = document.getElementById('contact-shortcut-menu');
if (contactShortcut && contactShortcutToggle && contactShortcutMenu) {
  const setContactMenuOpen = isOpen => {
    contactShortcutMenu.hidden = !isOpen;
    contactShortcutToggle.setAttribute('aria-expanded', String(isOpen));
    contactShortcutToggle.setAttribute('aria-label', isOpen ? 'Close contact links' : 'Open contact links');
  };
  contactShortcutToggle.addEventListener('click', () => {
    setContactMenuOpen(contactShortcutMenu.hidden);
  });
  contactShortcutMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setContactMenuOpen(false));
  });
  document.addEventListener('click', event => {
    if (event.target instanceof Node && !contactShortcut.contains(event.target)) {
      setContactMenuOpen(false);
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !contactShortcutMenu.hidden) {
      setContactMenuOpen(false);
      contactShortcutToggle.focus();
    }
  });
}

// Expand the About team photo in an accessible native dialog.
const teamPhotoButton = document.querySelector('.about-image-button');
const teamPhotoDialog = document.getElementById('team-photo-dialog');
const teamPhotoClose = teamPhotoDialog?.querySelector('.image-dialog-close');
if (teamPhotoButton && teamPhotoDialog instanceof HTMLDialogElement && teamPhotoClose) {
  teamPhotoButton.addEventListener('click', () => teamPhotoDialog.showModal());
  teamPhotoClose.addEventListener('click', () => teamPhotoDialog.close());
  teamPhotoDialog.addEventListener('cancel', event => {
    event.preventDefault();
    teamPhotoDialog.close();
  });
  teamPhotoDialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') teamPhotoDialog.close();
  });
  teamPhotoDialog.addEventListener('click', event => {
    if (event.target === teamPhotoDialog) teamPhotoDialog.close();
  });
}

// Enquiry form submits to the PHP/MySQL API. Requires hosting with PHP + MySQL.
const formStatus = document.getElementById('form-status');
if (enquiryForm) {
  let enquiryToken = '';
  fetch('api/index.php?action=enquiry-token').then(r=>r.json()).then(d=>{enquiryToken=d.csrf||'';}).catch(()=>{});
  enquiryForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!enquiryForm.reportValidity()) return;
    if (!enquiryToken) { if(formStatus) formStatus.textContent='Unable to connect to the enquiry service. Please refresh and try again.'; return; }
    const fd=new FormData(enquiryForm);
    const payload={name:fd.get('name'),company:fd.get('company')||'',email:fd.get('email'),phone:fd.get('phone')||'',service:fd.get('service')||'',message:fd.get('message'),website:fd.get('website')||'',csrf:enquiryToken};
    const submit=enquiryForm.querySelector('button[type="submit"]'); if(submit)submit.disabled=true;
    if(formStatus)formStatus.textContent='Submitting your enquiry…';
    try {
      const response=await fetch('api/index.php?action=create-enquiry',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Unable to submit enquiry.');
      if(formStatus)formStatus.textContent=data.message||'Thank you. Your enquiry has been submitted.';
      enquiryForm.reset();
      const tokenResponse=await fetch('api/index.php?action=enquiry-token'); const tokenData=await tokenResponse.json(); enquiryToken=tokenData.csrf||'';
    } catch(err) { if(formStatus)formStatus.textContent=err.message||'Unable to submit. Please call or email our team.'; }
    finally { if(submit)submit.disabled=false; }
  });
}
