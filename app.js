const SHEET_URL = 'https://docs.google.com/spreadsheets/d/18-noRoTzvpO1QRw83WhwuOA7Ba-dEgd8Kw7y3bg7mZk/gviz/tq?tqx=out:json';

fetch(SHEET_URL)
  .then(res => res.text())
  .then(text => {
    const json = JSON.parse(text.substr(47).slice(0, -2));
    const rows = json.table.rows;
    
    const sectionDescriptions = {};
    const badgeGroups = {};
    const sectionOrder = [];

    rows.slice(1).forEach((r, index) => {
      const section = r.c[0] ? r.c[0].v : 'Other';
      const title = r.c[1] ? r.c[1].v : 'Untitled';
      const description = r.c[2] ? r.c[2].v : '';
      const flag = r.c[3] ? r.c[3].v : '';
      const image = r.c[4] ? `images/${r.c[4].v}` : 'https://via.placeholder.com/110?text=Badge';
      
      const uniqueKey = `badge-id-index-${index}`; 

      if (!sectionOrder.includes(section)) {
        sectionOrder.push(section);
      }

      if (title === 'SECTION_DESCRIPTION') {
        sectionDescriptions[section] = description;
      } else {
        if (!badgeGroups[section]) badgeGroups[section] = [];
        badgeGroups[section].push({ uniqueKey, title, description, flag, image });
      }
    });

    // NEW AMENDMENT: Build the interactive Navigation Cards using {section}_section.png token images
    const navContainer = document.getElementById('section-nav');
    navContainer.innerHTML = ''; // Wipe loading state

    sectionOrder.forEach(section => {
      if (!badgeGroups[section] || badgeGroups[section].length === 0) return;
      
      // Cleanse string down to match lowercase naming parameters (e.g., "Oops!" becomes "oops")
      const cleanName = section.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const navCard = document.createElement('a');
      navCard.href = `#section-${cleanName}`;
      navCard.className = 'section-nav-card';
      navCard.innerHTML = `
        <img src="images/${cleanName}_section.png" alt="${section} Section" onerror="this.src='https://via.placeholder.com/70?text=${section}'">
        <span>${section}</span>
      `;
      navContainer.appendChild(navCard);
    });

    const container = document.getElementById('portfolio-container');
    container.innerHTML = ''; 

    sectionOrder.forEach(section => {
      if (!badgeGroups[section] || badgeGroups[section].length === 0) return;

      const cleanName = section.toLowerCase().replace(/[^a-z0-9]/g, '');

      // AMENDED: Adds matching ID anchor tag attributes to headers for navigation targets
      const heading = document.createElement('h2');
      heading.id = `section-${cleanName}`;
      heading.textContent = section;
      container.appendChild(heading);

      if (sectionDescriptions[section]) {
        const blurb = document.createElement('p');
        blurb.className = 'section-blurb';
        blurb.textContent = sectionDescriptions[section];
        container.appendChild(blurb);
      }

      const grid = document.createElement('div');
      grid.className = 'grid';

      badgeGroups[section].forEach(badge => {
        const card = document.createElement('div');
        card.className = 'card';
        
        if (badge.flag) card.setAttribute('data-flag', badge.flag);

        const isEarned = localStorage.getItem(badge.uniqueKey) === 'true';
        if (isEarned) card.classList.add('earned');

        const flagHTML = badge.flag ? `<span class="flag-pill">${badge.flag}</span>` : '';

        card.innerHTML = `
          <div class="img-container">
            <img src="${badge.image}" alt="${badge.title}">
            ${flagHTML}
          </div>
          <div class="title">${badge.title}</div>
          <p class="desc">${badge.description}</p>
          <label class="earned-label">
            <input type="checkbox" class="badge-checker" data-id="${badge.uniqueKey}" ${isEarned ? 'checked' : ''}> Earned It!
          </label>
        `;
        grid.appendChild(card);
      });

      container.appendChild(grid);
    });

    // AMENDED: Drastically scaled up particle firework engine calls to make clicking animations massive
    document.querySelectorAll('.badge-checker').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const cardElement = e.target.closest('.card');
        const badgeId = e.target.getAttribute('data-id');
        const isRare = cardElement.getAttribute('data-flag') === 'RARE!';

        if (e.target.checked) {
          cardElement.classList.add('earned');
          localStorage.setItem(badgeId, 'true'); 
          
          if (isRare) {
            // HUGE CRUISE-LINE EXPLOSION: Multi-angle continuous stream fireworks for RARE! items
            var duration = 3 * 1000;
            var end = Date.now() + duration;

            (function frame() {
              confetti({ particleCount: 7, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#ff4a3b', '#f59e0b', '#1e3a8a'] });
              confetti({ particleCount: 7, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#ff4a3b', '#f59e0b', '#1e3a8a'] });

              if (Date.now() < end) {
                requestAnimationFrame(frame);
              }
            }());
          } else {
            // STANDARD AMPED POP: Double-sided explosive blast layout for normal items
            confetti({ particleCount: 60, spread: 60, origin: { x: 0.2, y: 0.6 } });
            confetti({ particleCount: 60, spread: 60, origin: { x: 0.8, y: 0.6 } });
          }
        } else {
          cardElement.classList.remove('earned');
          localStorage.setItem(badgeId, 'false'); 
        }
      });
    });

    // Live Search Engine Filter
    document.getElementById('badge-search').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll('.card').forEach(card => {
        const title = card.querySelector('.title').textContent.toLowerCase();
        const desc = card.querySelector('.desc').textContent.toLowerCase();
        
        if (title.includes(query) || desc.includes(query)) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
      
      document.querySelectorAll('#portfolio-container h2').forEach(h2 => {
        let nextEl = h2.nextElementSibling;
        let hasVisibleCards = false;
        
        while (nextEl && nextEl.tagName !== 'H2') {
          if (nextEl.classList.contains('grid')) {
            const cards = nextEl.querySelectorAll('.card');
            cards.forEach(c => { if(c.style.display !== 'none') hasVisibleCards = true; });
          }
          nextEl = nextEl.nextElementSibling;
        }
        
        h2.style.display = hasVisibleCards ? 'block' : 'none';
        
        if (h2.nextElementSibling && h2.nextElementSibling.classList.contains('section-blurb')) {
          h2.nextElementSibling.style.display = hasVisibleCards ? 'block' : 'none';
        }
      });
    });

  })
  .catch(err => {
    document.getElementById('portfolio-container').innerHTML = '<div id="loading" style="color:#991b1b;">Error loading badges. Check configuration sharing.</div>';
    console.error(err);
  });
