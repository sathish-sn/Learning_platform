import { Component, OnInit, signal, computed, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Course {
  id: string;
  title: string;
  file: string;
  category: 'Frontend' | 'Backend' | 'Language' | 'Guide';
  icon: string;
  desc: string;
  tags: string[];
}

interface Chapter {
  id: string;
  title: string;
  elementId: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  template: `
    <div [attr.data-theme]="theme()" class="app-container" [class.dark-mode]="theme() === 'dark'">
      
      <!-- Side Navigation Panel -->
      <aside class="sidebar">
        <div class="sidebar-logo">
          <span class="logo-icon">🎓</span>
          <h2>SkillPortal</h2>
        </div>
        
        <nav class="nav-links">
          <button (click)="viewMode.set('dashboard')" [class.active]="viewMode() === 'dashboard'" class="nav-btn">
            <span class="btn-icon">📊</span> Dashboard
          </button>
          
          <div class="nav-section-title">Courses &amp; Roadmaps</div>
          
          @for (course of courses; track course.id) {
            <button (click)="selectCourse(course)" [class.active]="viewMode() === 'reader' && activeCourse()?.id === course.id" class="nav-btn course-nav-btn">
              <span class="btn-icon">{{ course.icon }}</span>
              <span class="course-nav-title">{{ course.title }}</span>
            </button>
          }
        </nav>
        
        <div class="sidebar-footer">
          <button (click)="toggleTheme()" class="theme-toggle-btn">
            {{ theme() === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode' }}
          </button>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="main-content">
        
        <!-- Top Navigation Bar -->
        <header class="top-nav">
          <div class="top-nav-left">
            @if (viewMode() === 'reader') {
              <button (click)="viewMode.set('dashboard')" class="back-btn">
                ← Back to Dashboard
              </button>
            } @else {
              <h1>Welcome back, Scholar</h1>
            }
          </div>
          
          <div class="top-nav-right">
            <div class="study-streak">
              🔥 <span class="streak-count">12 Day Streak</span>
            </div>
          </div>
        </header>

        <!-- DASHBOARD VIEW -->
        @if (viewMode() === 'dashboard') {
          <div class="dashboard-view animate-fade-in-up">
            
            <!-- Dashboard Highlights Header -->
            <section class="dashboard-hero">
              <div class="hero-left">
                <h2>Accelerate Your Engineering Career</h2>
                <p>Learn JavaScript, TypeScript, Angular 21, and Enterprise Java Backend with deep academic textbooks and interactive quizzes.</p>
              </div>
              <div class="hero-stats">
                <div class="hero-stat-card">
                  <div class="stat-num">7</div>
                  <div class="stat-lbl">Course Textbooks</div>
                </div>
                <div class="hero-stat-card">
                  <div class="stat-num">21</div>
                  <div class="stat-lbl">Study Modules</div>
                </div>
              </div>
            </section>

            <!-- Course Categories Selector -->
            <div class="category-filters">
              <button (click)="activeCategory.set('all')" [class.active]="activeCategory() === 'all'" class="filter-btn">All Topics</button>
              <button (click)="activeCategory.set('Language')" [class.active]="activeCategory() === 'Language'" class="filter-btn">Languages</button>
              <button (click)="activeCategory.set('Frontend')" [class.active]="activeCategory() === 'Frontend'" class="filter-btn">Frontend</button>
              <button (click)="activeCategory.set('Backend')" [class.active]="activeCategory() === 'Backend'" class="filter-btn">Backend</button>
              <button (click)="activeCategory.set('Guide')" [class.active]="activeCategory() === 'Guide'" class="filter-btn">Guides</button>
            </div>

            <!-- Course Cards Grid -->
            <div class="course-grid">
              @for (course of filteredCourses(); track course.id) {
                <div class="course-card">
                  <div class="card-header">
                    <span class="card-icon">{{ course.icon }}</span>
                    <span class="card-badge" [attr.data-cat]="course.category">{{ course.category }}</span>
                  </div>
                  <h3 class="card-title">{{ course.title }}</h3>
                  <p class="card-desc">{{ course.desc }}</p>
                  
                  <div class="card-tags">
                    @for (tag of course.tags; track tag) {
                      <span class="tag-badge">#{{ tag }}</span>
                    }
                  </div>
                  
                  <!-- Study Progress -->
                  <div class="progress-container">
                    <div class="progress-lbl-row">
                      <span>Course Progress</span>
                      <span>{{ getProgress(course.id) }}%</span>
                    </div>
                    <div class="progress-bar-bg">
                      <div class="progress-bar-fill" [style.width.%]="getProgress(course.id)"></div>
                    </div>
                  </div>

                  <button (click)="selectCourse(course)" class="start-btn">
                    {{ getProgress(course.id) > 0 ? 'Resume Course' : 'Start Learning' }}
                  </button>
                </div>
              }
            </div>
          </div>
        }

        <!-- READER VIEW -->
        @if (viewMode() === 'reader') {
          <div class="reader-layout animate-fade-in">
            
            <!-- Sidebar for Active Book Chapters -->
            <aside class="reader-toc">
              <h3>Chapters</h3>
              <div class="toc-links">
                @for (ch of chapters(); track ch.id) {
                  <button (click)="scrollToChapter(ch.elementId)" class="toc-link">
                    {{ ch.title }}
                  </button>
                } @empty {
                  <p class="toc-empty">Loading chapters...</p>
                }
              </div>
            </aside>

            <!-- Main Reading & Study Panel -->
            <div class="reader-main">
              
              <!-- Tab Navigation: Document vs Quiz vs Notes -->
              <div class="reader-tabs">
                <button (click)="activeTab.set('reading')" [class.active]="activeTab() === 'reading'" class="tab-btn">📖 Reading</button>
                <button (click)="activeTab.set('quiz')" [class.active]="activeTab() === 'quiz'" class="tab-btn">📝 Quiz</button>
                <button (click)="activeTab.set('notes')" [class.active]="activeTab() === 'notes'" class="tab-btn">✍️ My Notes</button>
              </div>

              <!-- READING CONTENT VIEW -->
              @if (activeTab() === 'reading') {
                <div class="reading-view">
                  <div class="reader-header">
                    <h2>{{ activeCourse()?.title }}</h2>
                    <span class="reading-progress-badge">Reading Progress: {{ getProgress(activeCourse()!.id) }}%</span>
                  </div>
                  
                  <!-- Scrollable Document Viewport -->
                  <div class="document-viewport" (scroll)="onViewportScroll($event)">
                    @if (loadingDoc()) {
                      <div class="doc-loading">
                        <div class="spinner"></div>
                        <p>Fetching course materials...</p>
                      </div>
                    } @else {
                      <div class="rendered-doc" [innerHTML]="safeHtml()"></div>
                    }
                  </div>
                </div>
              }

              <!-- INTERACTIVE QUIZ VIEW -->
              @if (activeTab() === 'quiz') {
                <div class="quiz-view animate-fade-in">
                  <div class="quiz-header">
                    <h2>Interactive Course Assessment</h2>
                    <p>Test your understanding of the material. Clear the quiz to boost your course progress!</p>
                  </div>
                  
                  <div class="quiz-body">
                    @for (q of quizQuestions(); track $index; let qIndex = $index) {
                      <div class="quiz-question-card">
                        <h4 class="question-title">Q{{ $index + 1 }}: {{ q.question }}</h4>
                        
                        <div class="quiz-options">
                          @for (opt of q.options; track optIndex; let optIndex = $index) {
                            <button 
                              (click)="selectAnswer(qIndex, optIndex)" 
                              [class.selected]="quizAnswers()[qIndex] === optIndex"
                              [class.correct]="quizSubmitted() && q.correct === optIndex"
                              [class.incorrect]="quizSubmitted() && quizAnswers()[qIndex] === optIndex && q.correct !== optIndex"
                              [disabled]="quizSubmitted()"
                              class="quiz-option-btn">
                              {{ opt }}
                            </button>
                          }
                        </div>

                        @if (quizSubmitted()) {
                          <div class="quiz-explanation" [class.correct]="quizAnswers()[$index] === q.correct">
                            <strong>{{ quizAnswers()[$index] === q.correct ? '✓ Correct!' : '✗ Incorrect' }}</strong>
                            <p>{{ q.explanation }}</p>
                          </div>
                        }
                      </div>
                    }

                    <div class="quiz-actions">
                      @if (!quizSubmitted()) {
                        <button (click)="submitQuiz()" [disabled]="!isQuizComplete()" class="quiz-submit-btn">Submit Answers</button>
                      } @else {
                        <button (click)="resetQuiz()" class="quiz-reset-btn">Retake Quiz</button>
                      }
                    </div>
                  </div>
                </div>
              }

              <!-- STUDY NOTES VIEW -->
              @if (activeTab() === 'notes') {
                <div class="notes-view animate-fade-in">
                  <div class="notes-header">
                    <h2>Course Journal</h2>
                    <p>Jot down summaries, ideas, and configurations. Notes are automatically saved locally.</p>
                  </div>
                  
                  <div class="notes-body">
                    <textarea 
                      [(ngModel)]="currentNotes" 
                      (ngModelChange)="saveNotes()" 
                      placeholder="Write your notes here..." 
                      class="notes-textarea"></textarea>
                    
                    <div class="notes-footer">
                      <span class="save-status">💾 Autocomplete Saved locally</span>
                    </div>
                  </div>
                </div>
              }

            </div>
          </div>
        }

      </main>
    </div>
  `,
  styles: []
})
export class App implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  // States
  protected readonly theme = signal<'light' | 'dark'>('light');
  protected readonly viewMode = signal<'dashboard' | 'reader'>('dashboard');
  protected readonly activeCategory = signal<string>('all');
  protected readonly activeCourse = signal<Course | null>(null);
  protected readonly activeTab = signal<'reading' | 'quiz' | 'notes'>('reading');
  protected readonly loadingDoc = signal<boolean>(false);
  protected readonly rawHtml = signal<string>('');
  protected readonly safeHtml = signal<SafeHtml>('');
  protected readonly chapters = signal<Chapter[]>([]);

  // Quiz States
  protected readonly quizQuestions = signal<QuizQuestion[]>([]);
  protected readonly quizAnswers = signal<number[]>([]);
  protected readonly quizSubmitted = signal<boolean>(false);

  // Notes States
  protected currentNotes = '';

  // Courses Catalogue
  protected readonly courses: Course[] = [
    {
      id: 'js-roadmap',
      title: 'JavaScript Complete Roadmap',
      file: 'JavaScript_Complete_Roadmap.html',
      category: 'Language',
      icon: '🟨',
      desc: 'Complete overview of Modern JavaScript from closures and prototypes to performance optimization patterns.',
      tags: ['JS', 'ES6+', 'Event Loop', 'Engine']
    },
    {
      id: 'ts-roadmap',
      title: 'TypeScript Complete Roadmap',
      file: 'TypeScript_Complete_Roadmap.html',
      category: 'Language',
      icon: '🟦',
      desc: 'Advanced type safety paradigms, mapped types, declaration merging, and compilation properties.',
      tags: ['TS', 'Types', 'Generics', 'OOP']
    },
    {
      id: 'angular-roadmap',
      title: 'Angular Roadmap',
      file: 'Angular_Complete_Roadmap.html',
      category: 'Frontend',
      icon: '🅰️',
      desc: 'Granular curriculum of Angular framework operations, workspace directory mapping, and state controls.',
      tags: ['Angular', 'Workspace', 'Components']
    },
    {
      id: 'angular-17',
      title: 'Angular 17 Core Principles',
      file: 'Angular17_Complete_Roadmap.html',
      category: 'Frontend',
      icon: '⚡',
      desc: 'Detailed summary of Angular 17 syntax updates, reactive signals, and standalone modularization.',
      tags: ['Angular 17', 'Signals', 'Standalone']
    },
    {
      id: 'angular-21',
      title: 'Angular 21 Concepts',
      file: 'Angular21_Complete_Roadmap.html',
      category: 'Frontend',
      icon: '🚀',
      desc: 'Leading overview of Angular 21 zoneless architectures, advanced dependency tree lookups, and compiler updates.',
      tags: ['Angular 21', 'Zoneless', 'Routing']
    },
    {
      id: 'angular-migration',
      title: 'Angular 17 to 21 Migration Guide',
      file: 'Angular_17_to_21_Migration_Guide.html',
      category: 'Guide',
      icon: '🔄',
      desc: 'Architectural map detailing updates, deprecations, and configuration transitions from v17 to v21.',
      tags: ['Migration', 'Upgrade', 'V17', 'V21']
    },
    {
      id: 'java-backend',
      title: 'Enterprise Java Backend Masterclass',
      file: 'Enterprise_Backend_Masterclass.html',
      category: 'Backend',
      icon: '☕',
      desc: 'Advanced backend mastery covering JVM internals, Spring Boot REST/Security, Postgres indexing, RabbitMQ, and Redis Cache.',
      tags: ['Java', 'Spring Boot', 'Postgres', 'RabbitMQ', 'Redis']
    }
  ];

  // Static Quizzes Bank
  private readonly quizzes: Record<string, QuizQuestion[]> = {
    'js-roadmap': [
      {
        question: 'What is the correct microtask/macrotask execution order in the JavaScript Event Loop?',
        options: [
          'All macrotasks in the queue execute first, followed by all microtasks.',
          'After each macrotask completes, the event loop runs all pending microtasks before executing the next macrotask.',
          'Microtasks and macrotasks are executed concurrently in separate threads.',
          'Microtasks are ignored if there are active user interaction events.'
        ],
        correct: 1,
        explanation: 'The event loop processes one macrotask from the queue. Once finished, it flushes the entire microtask queue before moving to the next macrotask.'
      },
      {
        question: 'How do modern JS Engines (like V8) optimize property lookups in objects?',
        options: [
          'By dynamically converting objects to binary search arrays.',
          'Using Hidden Classes (or Shapes) to share structure between objects with similar properties.',
          'By storing all property keys in global shared hashing arrays.',
          'Through automatic runtime garbage compaction.'
        ],
        correct: 1,
        explanation: 'V8 uses Hidden Classes (Shapes) to assign offsets to properties, enabling fast property lookup by avoiding costly dictionary lookups.'
      }
    ],
    'ts-roadmap': [
      {
        question: 'What is the primary difference between type and interface declarations in TypeScript?',
        options: [
          'Types support declaration merging; interfaces do not.',
          'Interfaces support declaration merging (they are open for extension); types are closed and cannot be merged.',
          'Types are only verified at runtime, whereas interfaces are checked at compile-time.',
          'Interfaces cannot be implemented by classes.'
        ],
        correct: 1,
        explanation: 'Interfaces allow declaration merging, meaning if you declare the same interface name multiple times, TS automatically merges their fields. Types cannot be redeclared.'
      }
    ],
    'angular-21': [
      {
        question: 'What is the primary benefit of Zoneless change detection in Angular 21?',
        options: [
          'It forces components to use zone.js for manual tracking.',
          'It removes the overhead of zone.js, using Signals and explicit notifications to trigger template updates directly, improving performance.',
          'It compiles all component styles globally.',
          'It disables reactive template bindings.'
        ],
        correct: 1,
        explanation: 'Zoneless change detection removes the dependency on zone.js. Templates are updated dynamically via reactive signal notifications, decreasing bundle sizes and reducing change detection cycles.'
      }
    ],
    'java-backend': [
      {
        question: 'How do you resolve the N+1 query performance bottleneck in Hibernate/JPA?',
        options: [
          'By adding a standard index to the child table primary keys.',
          'Using "JOIN FETCH" in JPQL queries, or configuring an Entity Graph to fetch child records in a single SQL operation.',
          'By setting the persistence isolation level to SERIALIZABLE.',
          'By changing all fields to transient.'
        ],
        correct: 1,
        explanation: 'JOIN FETCH forces Hibernate to perform an INNER or LEFT JOIN in the SQL query, loading the collection inside a single query instead of issuing separate database hits for each parent record.'
      }
    ]
  };

  // Filtered selector
  protected readonly filteredCourses = computed(() => {
    const cat = this.activeCategory();
    if (cat === 'all') return this.courses;
    return this.courses.filter(c => c.category === cat);
  });

  constructor() {
    // Load local storage states
    const localTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (localTheme) this.theme.set(localTheme);

    // Sync theme attributes
    effect(() => {
      document.body.setAttribute('data-theme', this.theme());
      localStorage.setItem('theme', this.theme());
    });
  }

  ngOnInit() {
    // Auto-load progress metrics
  }

  protected toggleTheme() {
    this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
  }

  // Course Selector
  protected selectCourse(course: Course) {
    this.activeCourse.set(course);
    this.viewMode.set('reader');
    this.activeTab.set('reading');
    this.loadingDoc.set(true);
    this.chapters.set([]);
    
    // Load local notes
    this.currentNotes = localStorage.getItem(`notes_${course.id}`) || '';

    // Set up quiz questions (fallback to generic backend if specific one is not defined)
    const activeQuiz = this.quizzes[course.id] || [
      {
        question: 'What is the primary architectural goal of this learning topic?',
        options: [
          'To write unstructured code without clean design pattern interfaces.',
          'To achieve production-grade scaling and modular separation of concerns.',
          'To run execution cycles without compile-time check configurations.',
          'To create static data assets.'
        ],
        correct: 1,
        explanation: 'Modern system frameworks seek to resolve decoupling problems, improve testability, and optimize performance.'
      }
    ];
    this.quizQuestions.set(activeQuiz);
    this.quizAnswers.set(new Array(activeQuiz.length).fill(-1));
    this.quizSubmitted.set(false);

    // Fetch and render documentation
    this.http.get(`./docs/${course.file}`, { responseType: 'text' }).subscribe({
      next: (html) => {
        this.rawHtml.set(html);
        
        // Extract Chapters from loaded HTML
        const parser = new DomParserWrapper(html);
        const parsedChapters = parser.extractChapters();
        this.chapters.set(parsedChapters);

        // Sanitize injected HTML
        const cleanedHtml = parser.getBodyHtml();
        this.safeHtml.set(this.sanitizer.bypassSecurityTrustHtml(cleanedHtml));
        this.loadingDoc.set(false);
      },
      error: (err) => {
        console.error('Failed to load doc:', err);
        this.safeHtml.set(this.sanitizer.bypassSecurityTrustHtml(`
          <div class="doc-error">
            <h3>⚠️ Resource Failed to Load</h3>
            <p>The textbook requested is temporarily unavailable. Please verify the copied asset: <strong>docs/${course.file}</strong></p>
          </div>
        `));
        this.loadingDoc.set(false);
      }
    });
  }

  // Progress metrics helpers
  protected getProgress(courseId: string): number {
    return parseInt(localStorage.getItem(`progress_${courseId}`) || '0', 10);
  }

  protected setProgress(courseId: string, value: number) {
    localStorage.setItem(`progress_${courseId}`, value.toString());
  }

  // Scroll reader tracking
  protected onViewportScroll(event: Event) {
    const el = event.target as HTMLElement;
    if (!el) return;
    
    const percentage = Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100);
    const activeId = this.activeCourse()?.id;
    if (activeId) {
      const current = this.getProgress(activeId);
      if (percentage > current) {
        this.setProgress(activeId, percentage);
      }
    }
  }

  // Scroll target navigation
  protected scrollToChapter(elementId: string) {
    const viewport = document.querySelector('.document-viewport');
    if (!viewport) return;
    
    // Find heading or element inside rendered doc
    const headings = viewport.querySelectorAll('h1, h2, h3, h4, [id]');
    for (let i = 0; i < headings.length; i++) {
      const h = headings[i] as HTMLElement;
      if (h.innerText.trim() === elementId.trim() || h.id === elementId) {
        viewport.scrollTo({
          top: h.offsetTop - 20,
          behavior: 'smooth'
        });
        break;
      }
    }
  }

  // Notes persistence
  protected saveNotes() {
    const activeId = this.activeCourse()?.id;
    if (activeId) {
      localStorage.setItem(`notes_${activeId}`, this.currentNotes);
    }
  }

  // Quiz actions
  protected selectAnswer(questionIndex: number, optionIndex: number) {
    const current = [...this.quizAnswers()];
    current[questionIndex] = optionIndex;
    this.quizAnswers.set(current);
  }

  protected isQuizComplete(): boolean {
    return this.quizAnswers().every(ans => ans !== -1);
  }

  protected submitQuiz() {
    this.quizSubmitted.set(true);
    // On successful submit, set progress to 100%
    const activeId = this.activeCourse()?.id;
    if (activeId) {
      this.setProgress(activeId, 100);
    }
  }

  protected resetQuiz() {
    const questionsCount = this.quizQuestions().length;
    this.quizAnswers.set(new Array(questionsCount).fill(-1));
    this.quizSubmitted.set(false);
  }
}

// Lightweight HTML Parser Utility to extract content chapters and structure
class DomParserWrapper {
  private parser = new DOMParser();
  private doc: Document;

  constructor(html: string) {
    this.doc = this.parser.parseFromString(html, 'text/html');
  }

  public extractChapters(): Chapter[] {
    const headings = this.doc.querySelectorAll('h2, h3');
    const chaptersList: Chapter[] = [];
    
    headings.forEach((heading, idx) => {
      const text = heading.textContent || '';
      if (text.trim() && text.length < 60) {
        chaptersList.push({
          id: `ch-${idx}`,
          title: text.replace('→', '').replace('👨‍🏫', '').trim(),
          elementId: text
        });
      }
    });
    
    return chaptersList;
  }

  public getBodyHtml(): string {
    // Return inner body or full document
    return this.doc.body ? this.doc.body.innerHTML : this.doc.documentElement.innerHTML;
  }
}
