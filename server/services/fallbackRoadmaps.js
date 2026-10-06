const fallbackTemplates = {
  web: [
    {
      title: 'Web foundations',
      topics: [
        { title: 'HTML structure and accessibility', description: 'Build semantic pages with accessible headings, forms, links, and media.', resourceIds: ['r1'] },
        { title: 'CSS layout and responsive design', description: 'Create responsive layouts with box model, Flexbox, Grid, and media queries.', resourceIds: ['r2'] },
        { title: 'Git and developer workflow', description: 'Use commits, branches, pull requests, and focused repository history.', resourceIds: ['r8', 'r36'] },
      ],
    },
    {
      title: 'JavaScript and React',
      topics: [
        { title: 'JavaScript language fundamentals', description: 'Practice variables, functions, arrays, objects, modules, and asynchronous code.', resourceIds: ['r3', 'r40'] },
        { title: 'React components and state', description: 'Build reusable components using props, state, events, and effects.', resourceIds: ['r4', 'r37'] },
        { title: 'Frontend project structure', description: 'Organize routes, components, API calls, loading states, and accessible forms.', resourceIds: ['r34', 'r37'] },
      ],
    },
    {
      title: 'Backend and data',
      topics: [
        { title: 'Node.js runtime fundamentals', description: 'Understand modules, HTTP, asynchronous I/O, and environment configuration.', resourceIds: ['r5'] },
        { title: 'Express REST APIs', description: 'Create validated routes, middleware, controllers, and consistent API errors.', resourceIds: ['r6'] },
        { title: 'MongoDB application data', description: 'Model documents, query collections, and connect MongoDB to an Express service.', resourceIds: ['r7', 'r38'] },
      ],
    },
    {
      title: 'Full-stack project practice',
      topics: [
        { title: 'Authentication and deployment basics', description: 'Connect frontend and backend authentication, environment variables, and deployment settings.', resourceIds: ['r5', 'r34'] },
        { title: 'Testing and debugging a web app', description: 'Test critical flows, inspect network requests, and fix responsive UI issues.', resourceIds: ['r34', 'r30'] },
        { title: 'Mini-project: ship a full-stack application', description: 'Plan, build, document, and deploy a small full-stack application for your portfolio.', resourceIds: ['r30', 'r37'] },
      ],
    },
  ],
  dsa: [
    {
      title: 'Complexity and core patterns',
      topics: [
        { title: 'Big-O and algorithm analysis', description: 'Analyze time and space complexity before choosing an implementation.', resourceIds: ['r18'] },
        { title: 'Arrays and strings', description: 'Solve traversal, prefix sum, two-pointer, sliding-window, and hashing problems.', resourceIds: ['r10', 'r11'] },
        { title: 'Sorting and searching', description: 'Implement common sorting methods and binary search variations.', resourceIds: ['r16', 'r17'] },
      ],
    },
    {
      title: 'Linked structures',
      topics: [
        { title: 'Linked lists', description: 'Practice reversing, merging, cycle detection, and pointer manipulation.', resourceIds: ['r12'] },
        { title: 'Stacks and queues', description: 'Use linear data structures for parsing, scheduling, and monotonic patterns.', resourceIds: ['r31', 'r35'] },
        { title: 'Recursion and backtracking', description: 'Model search trees and prune choices in combinatorial problems.', resourceIds: ['r31', 'r35'] },
      ],
    },
    {
      title: 'Trees and graphs',
      topics: [
        { title: 'Trees and binary search trees', description: 'Traverse, validate, and reason about recursive tree structures.', resourceIds: ['r13', 'r35'] },
        { title: 'Graphs and traversal', description: 'Apply BFS, DFS, visited sets, and shortest-path reasoning.', resourceIds: ['r14', 'r35'] },
        { title: 'Heaps and greedy choices', description: 'Use priority queues to process the most valuable item efficiently.', resourceIds: ['r31', 'r35'] },
      ],
    },
    {
      title: 'Placement readiness',
      topics: [
        { title: 'Dynamic programming patterns', description: 'Convert overlapping subproblems into memoized and tabulated solutions.', resourceIds: ['r15', 'r31'] },
        { title: 'Core CS interview subjects', description: 'Revise operating systems, DBMS, networking, and object-oriented design.', resourceIds: ['r20', 'r21', 'r22'] },
        { title: 'Mini-project: timed interview set', description: 'Complete a timed mixed problem set and explain tradeoffs aloud.', resourceIds: ['r28', 'r31'] },
      ],
    },
  ],
  ml: [
    {
      title: 'Python and data foundations',
      topics: [
        { title: 'Python programming fundamentals', description: 'Learn Python syntax, collections, functions, modules, and clean scripting habits.', resourceIds: ['r9', 'r39'] },
        { title: 'Object-oriented Python', description: 'Use classes and composition to structure reusable data and model code.', resourceIds: ['r20', 'r9'] },
        { title: 'SQL and data querying', description: 'Query, filter, join, and aggregate structured datasets with SQL.', resourceIds: ['r19', 'r32'] },
      ],
    },
    {
      title: 'Machine learning fundamentals',
      topics: [
        { title: 'Supervised learning concepts', description: 'Understand features, labels, training, validation, and generalization.', resourceIds: ['r29'] },
        { title: 'Regression and classification', description: 'Compare baseline models and choose metrics for common prediction tasks.', resourceIds: ['r29'] },
        { title: 'Data preparation and evaluation', description: 'Clean data, avoid leakage, and evaluate models with meaningful metrics.', resourceIds: ['r29', 'r19'] },
      ],
    },
    {
      title: 'Model improvement',
      topics: [
        { title: 'Feature engineering', description: 'Transform raw columns into useful signals while documenting assumptions.', resourceIds: ['r29'] },
        { title: 'Model selection and tuning', description: 'Use validation, baselines, and controlled experiments to improve results.', resourceIds: ['r29'] },
        { title: 'Responsible ML practice', description: 'Check data quality, bias, reproducibility, and clear communication of limitations.', resourceIds: ['r29', 'r33'] },
      ],
    },
    {
      title: 'Applied ML project',
      topics: [
        { title: 'ML project design', description: 'Define a useful problem, measurable target, data source, and success metric.', resourceIds: ['r29', 'r30'] },
        { title: 'Model results and presentation', description: 'Explain experiments, errors, tradeoffs, and next steps to a technical audience.', resourceIds: ['r29', 'r28'] },
        { title: 'Mini-project: end-to-end prediction system', description: 'Build, evaluate, document, and present an end-to-end machine learning project.', resourceIds: ['r29', 'r30'] },
      ],
    },
  ],
};

function categoryForGoal(goal = '') {
  const normalizedGoal = goal.toLowerCase();

  if (/web|frontend|front-end|backend|back-end|full.?stack|react|node|javascript/.test(normalizedGoal)) {
    return 'web';
  }

  if (/\b(ai|ml)\b|machine[ -]learning|data science|deep learning/.test(normalizedGoal)) {
    return 'ml';
  }

  return 'dsa';
}

function cloneModule(module) {
  return {
    title: module.title,
    topics: module.topics.map((topic) => ({
      ...topic,
      resourceIds: [...topic.resourceIds],
    })),
  };
}

function scaleModules(template, totalWeeks) {
  const moduleCount = Math.min(template.length, totalWeeks);
  const modules = template.slice(0, moduleCount).map(cloneModule);
  if (moduleCount < template.length) {
    const finalModule = modules.at(-1);
    const project = template.at(-1).topics.at(-1);
    finalModule.title += ' and project practice';
    finalModule.topics[finalModule.topics.length - 1] = {
      ...project,
      resourceIds: [...project.resourceIds],
    };
  }
  const baseWeeks = Math.floor(totalWeeks / moduleCount);
  const extraWeeks = totalWeeks % moduleCount;
  let nextWeek = 1;

  return modules.map((module, index) => {
    const duration = baseWeeks + (index < extraWeeks ? 1 : 0);
    const scaledModule = {
      ...module,
      weekStart: nextWeek,
      weekEnd: nextWeek + duration - 1,
    };
    nextWeek = scaledModule.weekEnd + 1;
    return scaledModule;
  });
}

export function createFallbackRoadmap(goal, totalWeeks) {
  const category = categoryForGoal(goal);
  const template = fallbackTemplates[category];

  return {
    category,
    modules: scaleModules(template, totalWeeks),
  };
}
