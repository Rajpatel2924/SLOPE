import ResourceLink from '../components/ResourceLink.jsx';

const practiceSections = [
  {
    id: 'dsa', title: 'DSA practice', description: 'Learn a pattern, solve a few problems, then explain your approach aloud.',
    checklist: ['Start with arrays, strings, hashing, and two pointers.', 'Move to linked lists, stacks, trees, and graph traversal.', 'Practice binary search, greedy choices, and dynamic programming.', 'Compare time and space complexity after every solution.'],
    resources: [
      { id: 'r31', title: 'LeetCode problem set', topic: 'dsa-practice', level: 'intermediate', type: 'practice', url: 'https://leetcode.com/problemset/' },
      { id: 'r35', title: 'NeetCode interview roadmap', topic: 'dsa-roadmap', level: 'intermediate', type: 'course', url: 'https://neetcode.io/roadmap' },
      { id: 'r32', title: 'HackerRank SQL practice', topic: 'sql-practice', level: 'intermediate', type: 'practice', url: 'https://www.hackerrank.com/domains/sql' },
    ],
  },
  {
    id: 'aptitude', title: 'Aptitude preparation', description: 'Use short timed sets and keep a written record of mistakes to revisit.',
    checklist: ['Quantitative: percentages, ratios, averages, time and work.', 'Logical: arrangements, sequences, deductions, and puzzles.', 'Verbal: comprehension, sentence correction, and vocabulary.', 'Review accuracy before increasing your solving speed.'],
    resources: [
      { id: 'r24', title: 'Quantitative aptitude practice', topic: 'aptitude-quant', level: 'beginner', type: 'practice', url: 'https://www.indiabix.com/aptitude/questions-and-answers/' },
      { id: 'r25', title: 'Logical reasoning practice', topic: 'logical-reasoning', level: 'beginner', type: 'practice', url: 'https://www.indiabix.com/logical-reasoning/questions-and-answers/' },
      { id: 'r26', title: 'Verbal ability practice', topic: 'verbal-ability', level: 'beginner', type: 'practice', url: 'https://www.indiabix.com/verbal-ability/questions-and-answers/' },
    ],
  },
];

const interviewGroups = [
  {
    title: 'HR and communication', questions: [
      ['Tell me about yourself.', 'Give a 60–90 second introduction: education, relevant skills, one project, and the role you want.'],
      ['Why do you want this role?', 'Connect the role’s responsibilities to a skill you enjoy using and a concrete example of your work.'],
      ['Describe a difficult team situation.', 'Use Situation, Task, Action, Result. Explain your own contribution and what you learned.'],
      ['What is a weakness you are improving?', 'Choose a genuine skill gap, explain the steps you are taking, and give evidence of progress.'],
    ],
  },
  {
    title: 'Technical fundamentals', questions: [
      ['How would you analyze an algorithm’s complexity?', 'Explain how work grows with input size. Include auxiliary space and compare common approaches.'],
      ['How do processes and threads differ?', 'Discuss memory isolation, shared state, scheduling, and synchronization.'],
      ['What are normalization and database indexes?', 'Explain reducing data duplication, faster reads, and the storage/write cost of indexes.'],
      ['What happens when you open a URL?', 'Walk through DNS, the connection, HTTP or HTTPS, the response, and browser rendering.'],
      ['Explain the main OOP principles.', 'Use a small example to connect encapsulation, abstraction, inheritance, and polymorphism.'],
      ['What would you change in your best project?', 'Describe its architecture, one tradeoff, one failure you fixed, and a measurable improvement.'],
    ],
  },
];

const resumeTips = [
  'Keep an early-career resume focused and usually one page long.',
  'Describe project contributions with action verbs and meaningful results.',
  'List skills you can demonstrate, and tailor them to the role.',
  'Include working GitHub and deployed-project links with readable READMEs.',
  'Use a simple layout, export to PDF, and proofread names, dates, and contact details.',
];

const projects = [
  { title: 'Accessible portfolio', difficulty: 'Beginner', skills: 'HTML · CSS · Git', description: 'Build a responsive portfolio with project case studies, keyboard navigation, and a deployed public URL.' },
  { title: 'Study planner', difficulty: 'Beginner', skills: 'React · Forms · REST', description: 'Create, edit, and complete study tasks. Add useful filtering and clear loading and empty states.' },
  { title: 'Expense tracker', difficulty: 'Beginner', skills: 'JavaScript · React · Charts', description: 'Track spending by category and month, then summarize totals and trends with accessible charts.' },
  { title: 'Job application tracker', difficulty: 'Intermediate', skills: 'React · Express · MongoDB', description: 'Build authenticated CRUD flows for applications, interview stages, notes, and search.' },
  { title: 'Library management system', difficulty: 'Intermediate', skills: 'Node.js · MongoDB · Validation', description: 'Model books and borrowing records, validate API requests, and handle availability and overdue dates.' },
  { title: 'DSA visualizer', difficulty: 'Intermediate', skills: 'JavaScript · Algorithms · UI', description: 'Animate sorting and searching step by step, with speed controls and complexity explanations.' },
  { title: 'Student performance predictor', difficulty: 'Intermediate', skills: 'Python · Machine learning', description: 'Train a baseline model on a public dataset, separate training and validation data, and document evaluation results.' },
  { title: 'Real-time collaboration board', difficulty: 'Advanced', skills: 'React · Node.js · WebSockets', description: 'Build shared task boards and handle reconnects, concurrent edits, authorization, and consistent state.' },
];

const badgeClasses = {
  Beginner: 'bg-emerald-50 text-emerald-800',
  Intermediate: 'bg-amber-50 text-amber-900',
  Advanced: 'bg-rose-50 text-rose-800',
};

export default function Placement() {
  return (
    <section className="page-shell space-y-8 py-10 sm:py-14">
      <header><p className="eyebrow">Placement preparation</p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Prepare a little, every day</h1><p className="mt-4 max-w-3xl text-slate-600">Practice problem solving, revise core subjects, and learn to explain the work you have built.</p></header>
      <nav aria-label="Placement sections" className="flex flex-wrap gap-2">
        {[['dsa', 'DSA'], ['aptitude', 'Aptitude'], ['interviews', 'Interviews'], ['resume', 'Resume'], ['projects', 'Projects']].map(([id, title]) => <a key={id} href={`#${id}`} className="btn btn-secondary">{title}</a>)}
      </nav>
      <div className="grid gap-6 lg:grid-cols-2">
        {practiceSections.map((section) => (
          <section key={section.id} id={section.id} className="card scroll-mt-6">
            <h2 className="text-xl font-bold">{section.title}</h2><p className="mt-3 text-sm leading-relaxed text-slate-600">{section.description}</p>
            <ul className="mt-4 list-outside list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600">{section.checklist.map((item) => <li key={item}>{item}</li>)}</ul>
            <div className="mt-6 grid gap-2">{section.resources.map((resource) => <ResourceLink key={resource.id} resource={resource} />)}</div>
          </section>
        ))}
      </div>
      <section id="interviews" className="card scroll-mt-6">
        <h2 className="text-xl font-bold">Interview preparation</h2><p className="mt-3 text-sm text-slate-600">Open a question for an answer outline, then rehearse your own explanation aloud.</p>
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          {interviewGroups.map((group) => <div key={group.title}><h3 className="mb-3 font-bold text-indigo-800">{group.title}</h3>{group.questions.map(([question, hint]) => <details key={question} className="border-b border-slate-200 py-2"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-slate-800">{question}</summary><p className="pb-3 text-sm leading-relaxed text-slate-600">{hint}</p></details>)}</div>)}
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <ResourceLink resource={{ id: 'r28', title: 'Software developer interview preparation', topic: 'interview-preparation', level: 'intermediate', type: 'article', url: 'https://www.geeksforgeeks.org/interview-preparation-for-software-developers/' }} />
          <ResourceLink resource={{ id: 'r33', title: 'CS50x introduction to computer science', topic: 'computer-science-foundations', level: 'beginner', type: 'course', url: 'https://cs50.harvard.edu/x/' }} />
        </div>
      </section>
      <section id="resume" className="card scroll-mt-6">
        <h2 className="text-xl font-bold">Resume tips</h2>
        <ul className="mt-4 list-outside list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600">{resumeTips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
        <div className="mt-6 max-w-xl"><ResourceLink resource={{ id: 'r27', title: 'Create a strong resume', topic: 'resume', level: 'beginner', type: 'article', url: 'https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/' }} /></div>
      </section>
      <section id="projects" className="scroll-mt-6">
        <h2 className="text-2xl font-bold">Eight project ideas for your portfolio</h2><p className="mt-3 text-sm text-slate-600">Choose one you can finish, test, deploy, and explain. A clear README and a thoughtful demo matter.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {projects.map((project) => <article key={project.title} className="card"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-bold">{project.title}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses[project.difficulty]}`}>{project.difficulty}</span></div><p className="mt-3 text-sm leading-relaxed text-slate-600">{project.description}</p><p className="mt-4 text-xs font-medium text-indigo-700">{project.skills}</p></article>)}
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <ResourceLink resource={{ id: 'r30', title: 'Build your own X project ideas', topic: 'project-practice', level: 'advanced', type: 'practice', url: 'https://github.com/codecrafters-io/build-your-own-x' }} />
          <ResourceLink resource={{ id: 'r34', title: 'freeCodeCamp curriculum', topic: 'full-stack-development', level: 'beginner', type: 'course', url: 'https://www.freecodecamp.org/learn/' }} />
        </div>
      </section>
    </section>
  );
}
