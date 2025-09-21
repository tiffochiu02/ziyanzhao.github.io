(function () {
  'use strict';

  var dataCache = {};

  function fetchJSON(path) {
    if (dataCache[path]) {
      return dataCache[path];
    }
    var request = fetch(path).then(function (response) {
      if (!response.ok) {
        throw new Error('Failed to load ' + path);
      }
      return response.json();
    });
    dataCache[path] = request;
    return request;
  }

  function slugify(value) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function initEmail() {
    var username = 'ziyanzhao1106';
    var domain = 'gmail.com';
    var email = username + '@' + domain;
    var links = document.querySelectorAll('[data-email-link], [data-email-link-secondary]');
    for (var i = 0; i < links.length; i += 1) {
      var link = links[i];
      link.setAttribute('href', 'mailto:' + email);
      link.setAttribute('data-email-initialised', 'true');
    }
    var textNodes = document.querySelectorAll('[data-email-text]');
    for (var j = 0; j < textNodes.length; j += 1) {
      textNodes[j].textContent = email;
    }
  }

  function applyTheme(theme) {
    var root = document.documentElement;
    root.dataset.theme = theme;
    var toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) {
      toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    }
    try {
      localStorage.setItem('zz-theme', theme);
    } catch (err) {
      // localStorage may be unavailable
    }
  }

  function initThemeToggle() {
    var storedTheme = null;
    try {
      storedTheme = localStorage.getItem('zz-theme');
    } catch (err) {
      storedTheme = null;
    }
    var prefersDark = false;
    if (window.matchMedia) {
      prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    var initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(initialTheme);

    var toggle = document.querySelector('[data-theme-toggle]');
    if (!toggle) {
      return;
    }
    toggle.addEventListener('click', function () {
      var current = document.documentElement.dataset.theme || 'light';
      applyTheme(current === 'light' ? 'dark' : 'light');
    });
  }

  function initReveal() {
    var nodes = document.querySelectorAll('[data-animate]');
    if (!nodes.length) {
      return;
    }
    if (!('IntersectionObserver' in window)) {
      for (var i = 0; i < nodes.length; i += 1) {
        nodes[i].classList.add('is-visible');
      }
      return;
    }
    var prefersReduced = false;
    if (window.matchMedia) {
      prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    if (prefersReduced) {
      for (var j = 0; j < nodes.length; j += 1) {
        nodes[j].classList.add('is-visible');
      }
      return;
    }

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -10%' });

    for (var k = 0; k < nodes.length; k += 1) {
      revealObserver.observe(nodes[k]);
    }
  }

  function initCurrentYear() {
    var year = String(new Date().getFullYear());
    var targets = document.querySelectorAll('[data-current-year]');
    for (var i = 0; i < targets.length; i += 1) {
      targets[i].textContent = year;
    }
  }

  function initNav() {
    var header = document.querySelector('.site-header');
    var navList = document.querySelector('[data-nav-list]');
    var navToggle = document.querySelector('[data-nav-toggle]');
    if (!header || !navList) {
      return;
    }

    function closeNav() {
      header.classList.remove('is-nav-open');
      if (navToggle) {
        navToggle.setAttribute('aria-expanded', 'false');
      }
    }

    if (navToggle) {
      navToggle.addEventListener('click', function () {
        var isOpen = header.classList.contains('is-nav-open');
        header.classList.toggle('is-nav-open', !isOpen);
        navToggle.setAttribute('aria-expanded', String(!isOpen));
        if (!isOpen) {
          var firstLink = navList.querySelector('a');
          if (firstLink) {
            firstLink.focus();
          }
        }
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          closeNav();
        }
      });
    }

    navList.addEventListener('click', function (event) {
      var target = event.target;
      if (target && target.tagName === 'A') {
        closeNav();
      }
    });

    fetchJSON('data/navigation.json')
      .then(function (items) {
        if (!items || !items.length) {
          setupActiveLinkObserver(navList);
          return;
        }
        var currentPath = window.location.pathname.split('/').pop() || 'index.html';
        var fragment = document.createDocumentFragment();
        for (var i = 0; i < items.length; i += 1) {
          var item = items[i];
          if (!item || !item.label || !item.href) {
            continue;
          }
          var li = document.createElement('li');
          var link = document.createElement('a');
          var href = item.href;
          if (currentPath === '' || currentPath === 'index.html') {
            if (href.indexOf('index.html#') === 0) {
              href = href.replace('index.html', '');
            }
          } else if (href.charAt(0) === '#') {
            href = 'index.html' + href;
          }
          link.setAttribute('href', href);
          link.textContent = item.label;
          if (item.external) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener');
          }
          li.appendChild(link);
          fragment.appendChild(li);
        }
        if (fragment.childNodes.length) {
          navList.innerHTML = '';
          navList.appendChild(fragment);
        }
        setupActiveLinkObserver(navList);
      })
      .catch(function () {
        setupActiveLinkObserver(navList);
      });
  }

  function setupActiveLinkObserver(navList) {
    if (!('IntersectionObserver' in window)) {
      return;
    }
    var links = navList.querySelectorAll('a');
    if (!links.length) {
      return;
    }
    var sectionMap = new Map();
    for (var i = 0; i < links.length; i += 1) {
      var link = links[i];
      var href = link.getAttribute('href');
      if (!href || href.indexOf('#') === -1) {
        continue;
      }
      var id = href.split('#')[1];
      var section = document.getElementById(id);
      if (section) {
        sectionMap.set(section, link);
      }
    }
    if (!sectionMap.size) {
      return;
    }

    var activeLink = null;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var link = sectionMap.get(entry.target);
          if (link && link !== activeLink) {
            if (activeLink) {
              activeLink.dataset.active = 'false';
            }
            link.dataset.active = 'true';
            activeLink = link;
          }
        }
      });
    }, { threshold: 0.55, rootMargin: '-10% 0px -35%' });

    sectionMap.forEach(function (_, section) {
      observer.observe(section);
    });
  }

  function ensureCaseLink(project) {
    if (!project.links) {
      project.links = {};
    }
    if (!project.links.case) {
      project.links.case = '#' + project.slug;
    }
    return project.links.case;
  }

  function createProjectCard(project, context) {
    var page = context && context.page ? context.page : '';
    var article = document.createElement('article');
    article.className = 'card card--project';
    article.setAttribute('data-tags', (project.tags || []).join(','));

    var figure = document.createElement('figure');
    figure.className = 'card-media';
    var img = document.createElement('img');
    img.src = project.cover;
    img.srcset = project.cover + ' 1x';
    img.alt = project.title + ' cover image';
    img.loading = 'lazy';
    img.decoding = 'async';
    figure.appendChild(img);
    article.appendChild(figure);

    var inner = document.createElement('div');
    inner.className = 'card-inner';

    var eyebrow = document.createElement('span');
    eyebrow.className = 'card-eyebrow';
    eyebrow.textContent = project.year + ' - ' + project.role;
    inner.appendChild(eyebrow);

    var title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = project.title;
    inner.appendChild(title);

    var summary = document.createElement('p');
    summary.className = 'card-body';
    summary.textContent = project.summary;
    inner.appendChild(summary);

    if (Array.isArray(project.stack) && project.stack.length) {
      var tagList = document.createElement('ul');
      tagList.className = 'tag-list';
      for (var i = 0; i < project.stack.length && i < 4; i += 1) {
        var tag = document.createElement('li');
        tag.className = 'tag';
        tag.textContent = project.stack[i];
        tagList.appendChild(tag);
      }
      inner.appendChild(tagList);
    }

    var caseHref = ensureCaseLink(project);
    var actions = document.createElement('div');
    actions.className = 'card-cta';

    if (caseHref) {
      var viewCase = document.createElement('a');
      viewCase.className = 'btn btn-link';
      viewCase.textContent = 'View case study';
      if (page === 'index' && caseHref.charAt(0) === '#') {
        viewCase.href = 'projects.html' + caseHref;
      } else {
        viewCase.href = caseHref;
      }
      actions.appendChild(viewCase);
    }
    if (project.links && project.links.repo) {
      var repoLink = document.createElement('a');
      repoLink.className = 'btn btn-link';
      repoLink.textContent = 'View repo';
      repoLink.href = project.links.repo;
      repoLink.target = '_blank';
      repoLink.rel = 'noopener';
      actions.appendChild(repoLink);
    }

    if (actions.childNodes.length) {
      inner.appendChild(actions);
    }

    article.appendChild(inner);
    return article;
  }

  function renderFeaturedProjects(projects) {
    var container = document.querySelector('[data-projects-highlight]');
    if (!container) {
      return;
    }
    container.innerHTML = '';
    var featured = projects.slice(0, 2);
    if (!featured.length) {
      container.textContent = 'Projects will appear here soon.';
      return;
    }
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < featured.length; i += 1) {
      fragment.appendChild(createProjectCard(featured[i], { page: 'index' }));
    }
    container.appendChild(fragment);
  }

  function renderProjectGrid(projects) {
    var grid = document.querySelector('[data-projects-grid]');
    if (!grid) {
      return;
    }
    grid.innerHTML = '';
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < projects.length; i += 1) {
      fragment.appendChild(createProjectCard(projects[i], { page: 'projects' }));
    }
    grid.appendChild(fragment);
  }

  function renderCaseStudies(projects) {
    var container = document.querySelector('[data-case-studies]');
    if (!container) {
      return;
    }
    container.innerHTML = '';
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < projects.length; i += 1) {
      var project = projects[i];
      var caseHref = ensureCaseLink(project);
      var anchorId = caseHref && caseHref.charAt(0) === '#' ? caseHref.slice(1) : caseHref;
      if (!anchorId) {
        anchorId = project.slug;
      }
      var article = document.createElement('article');
      article.className = 'card case-study';
      article.id = anchorId;
      article.setAttribute('tabindex', '-1');

      var header = document.createElement('header');
      header.className = 'card-header';
      var title = document.createElement('h3');
      title.className = 'card-title';
      title.textContent = project.title;
      header.appendChild(title);
      var meta = document.createElement('p');
      meta.className = 'case-study-meta';
      meta.textContent = project.role + ' | ' + project.year;
      header.appendChild(meta);
      var summary = document.createElement('p');
      summary.className = 'card-body';
      summary.textContent = project.summary;
      header.appendChild(summary);
      article.appendChild(header);

      if (Array.isArray(project.highlights) && project.highlights.length) {
        var highlightList = document.createElement('ul');
        highlightList.className = 'tag-list';
        for (var h = 0; h < project.highlights.length; h += 1) {
          var highlight = document.createElement('li');
          highlight.className = 'tag';
          highlight.textContent = project.highlights[h];
          highlightList.appendChild(highlight);
        }
        article.appendChild(highlightList);
      }

      if (project.details) {
        var columns = document.createElement('div');
        columns.className = 'case-columns';
        var keys = ['problem', 'approach', 'outcome'];
        for (var d = 0; d < keys.length; d += 1) {
          var key = keys[d];
          var entries = project.details[key];
          if (!Array.isArray(entries) || !entries.length) {
            continue;
          }
          var block = document.createElement('div');
          var heading = document.createElement('h4');
          heading.textContent = key.charAt(0).toUpperCase() + key.slice(1);
          block.appendChild(heading);
          var list = document.createElement('ul');
          for (var e = 0; e < entries.length; e += 1) {
            var li = document.createElement('li');
            li.textContent = entries[e];
            list.appendChild(li);
          }
          block.appendChild(list);
          columns.appendChild(block);
        }
        if (columns.childNodes.length) {
          article.appendChild(columns);
        }
      }

      var linkRow = document.createElement('div');
      linkRow.className = 'case-links';
      var topLink = document.createElement('a');
      topLink.className = 'btn btn-outline';
      topLink.href = '#projects-top';
      topLink.textContent = 'Back to filters';
      linkRow.appendChild(topLink);

      if (project.links && project.links.repo) {
        var repoLink = document.createElement('a');
        repoLink.className = 'btn btn-primary';
        repoLink.href = project.links.repo;
        repoLink.target = '_blank';
        repoLink.rel = 'noopener';
        repoLink.textContent = 'View repository';
        linkRow.appendChild(repoLink);
      }
      if (project.links && project.links.demo) {
        var demoLink = document.createElement('a');
        demoLink.className = 'btn btn-secondary';
        demoLink.href = project.links.demo;
        demoLink.target = '_blank';
        demoLink.rel = 'noopener';
        demoLink.textContent = 'View demo';
        linkRow.appendChild(demoLink);
      }
      article.appendChild(linkRow);
      fragment.appendChild(article);
    }
    container.appendChild(fragment);
  }

  function initProjectFilters() {
    var buttons = document.querySelectorAll('[data-filter]');
    if (!buttons.length) {
      return;
    }
    var grid = document.querySelector('[data-projects-grid]');
    if (!grid) {
      return;
    }
    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var target = button.getAttribute('data-filter');
        buttons.forEach(function (btn) {
          var isActive = btn === button;
          btn.classList.toggle('is-active', isActive);
          btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        var cards = grid.querySelectorAll('[data-tags]');
        cards.forEach(function (card) {
          var tags = (card.getAttribute('data-tags') || '').split(',');
          var shouldShow = target === 'all' || tags.indexOf(target) !== -1;
          card.hidden = !shouldShow;
        });
      });
    });
  }

  function renderExperience(experiences) {
    var list = document.querySelector('[data-experience]');
    if (!list) {
      return;
    }
    list.innerHTML = '';
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < experiences.length; i += 1) {
      var role = experiences[i];
      var item = document.createElement('li');
      item.className = 'timeline-item';
      var header = document.createElement('div');
      header.className = 'timeline-header';
      var title = document.createElement('span');
      title.className = 'timeline-role';
      title.textContent = role.title + ' - ' + role.company;
      header.appendChild(title);
      var meta = document.createElement('span');
      meta.className = 'timeline-meta';
      meta.textContent = role.period + ' | ' + role.location;
      header.appendChild(meta);
      item.appendChild(header);
      if (Array.isArray(role.summary) && role.summary.length) {
        var points = document.createElement('ul');
        points.className = 'timeline-points';
        for (var j = 0; j < role.summary.length; j += 1) {
          var point = document.createElement('li');
          point.textContent = role.summary[j];
          points.appendChild(point);
        }
        item.appendChild(points);
      }
      fragment.appendChild(item);
    }
    list.appendChild(fragment);
  }

  function initProjects() {
    fetchJSON('data/projects.json')
      .then(function (projects) {
        if (!Array.isArray(projects)) {
          return;
        }
        for (var i = 0; i < projects.length; i += 1) {
          var project = projects[i];
          project.slug = project.slug || slugify(project.title);
          ensureCaseLink(project);
        }
        renderFeaturedProjects(projects);
        renderProjectGrid(projects);
        renderCaseStudies(projects);
        initProjectFilters();
      })
      .catch(function () {
        var container = document.querySelector('[data-projects-highlight]');
        if (container) {
          container.textContent = 'Projects are unavailable right now.';
        }
      });
  }

  function initExperience() {
    fetchJSON('data/experience.json')
      .then(function (experience) {
        if (Array.isArray(experience)) {
          renderExperience(experience);
        }
      })
      .catch(function () {
        var container = document.querySelector('[data-experience]');
        if (container) {
          container.innerHTML = '<li class="timeline-item">Experience details are unavailable right now.</li>';
        }
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initEmail();
    initThemeToggle();
    initNav();
    initReveal();
    initCurrentYear();
    initProjects();
    initExperience();
  });
}());



