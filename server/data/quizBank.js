// Curated sets name their coverage explicitly; unsupported topics use AI or return 503.
const sets = [
  ['HTML and accessibility', /html|accessibility|semantic/i, [
    ['Which element represents the main page content?', ['<main>', '<span>', '<b>', '<br>'], 0, '<main> identifies the dominant content of a document.'],
    ['How should a form label connect to an input?', ['Matching label for and input id', 'Matching text color', 'Only using a placeholder', 'Placing the input in a footer'], 0, 'An explicit label uses for to reference the input id.'],
    ['What should an informative image have?', ['A descriptive alt attribute', 'An empty src', 'A hidden heading', 'Only a title tooltip'], 0, 'Alternative text conveys the image information to people who cannot see it.'],
    ['Which element is appropriate for an action on the current page?', ['<button>', '<div> with no keyboard support', '<img>', '<br>'], 0, 'Buttons provide keyboard interaction and button semantics.'],
    ['How should page headings be organized?', ['By content hierarchy', 'Only by desired font size', 'All as h1', 'Without headings'], 0, 'Heading levels communicate the structure of the page.'],
  ]],
  ['CSS layout', /css|flexbox|grid|responsive|layout/i, [
    ['What does border-box sizing include in the declared width?', ['Content, padding, and border', 'Only content', 'Only margin', 'Only border'], 0, 'border-box includes padding and border, but not margin.'],
    ['Which layout system is designed for two-dimensional rows and columns?', ['CSS Grid', 'Only float', 'Only text-align', 'Inline text'], 0, 'Grid controls rows and columns together.'],
    ['With flex-direction: row, which property aligns items on the main axis?', ['justify-content', 'font-weight', 'z-index', 'opacity'], 0, 'justify-content distributes items along the main axis.'],
    ['What is a media query used for?', ['Applying styles under conditions such as viewport width', 'Sending a database query', 'Setting an HTML title', 'Hashing a password'], 0, 'Media queries let styles respond to device and viewport conditions.'],
    ['What does gap control in Grid and Flexbox?', ['Space between items', 'The font size', 'The border color', 'The page title'], 0, 'gap sets spacing between rows or columns of items.'],
  ]],
  ['JavaScript arrays', /javascript.*arrays?|arrays?.*javascript/i, [
    ['What does [1, 2, 3].map(x => x * 2) return?', ['[2, 4, 6]', '[1, 2, 3]', '6', 'undefined'], 0, 'map returns a new array containing each transformed element.'],
    ['Which JavaScript method keeps elements matching a condition?', ['filter', 'push', 'join', 'reverse'], 0, 'filter produces a new array of elements for which the callback returns true.'],
    ['What is the first array index in JavaScript?', ['0', '1', '-1', 'The array length'], 0, 'JavaScript arrays are zero-indexed.'],
    ['What does Array.prototype.push do?', ['Appends elements and returns the new length', 'Removes the first element', 'Sorts without mutation', 'Always returns a copy'], 0, 'push mutates the array by appending values and returns its length.'],
    ['Which operation is normally O(n) for an array of n items?', ['Visiting every item once', 'Reading a known index', 'Reading the stored length', 'Comparing two fixed numbers'], 0, 'A complete traversal visits n elements.'],
  ]],
  ['JavaScript functions', /functions?/i, [
    ['What does a JavaScript function return without a return statement?', ['undefined', 'null', 'true', '0'], 0, 'Functions return undefined when no value is explicitly returned.'],
    ['What is a closure?', ['A function with access to its surrounding lexical scope', 'A deleted function', 'A CSS rule', 'A database connection'], 0, 'A closure retains access to variables in the scope where the function was defined.'],
    ['What is a higher-order function?', ['A function taking or returning another function', 'A function with a long name', 'Only a recursive function', 'Only a global function'], 0, 'Higher-order functions treat other functions as values.'],
    ['Why is a pure function easier to test?', ['Its output depends on its inputs without external side effects', 'It never accepts inputs', 'It always uses global state', 'It only works in browsers'], 0, 'Pure functions have predictable input-output behavior.'],
    ['How do you call a function named greet?', ['greet()', 'call:greet', '<greet>', 'greet[]'], 0, 'Parentheses invoke the function.'],
  ]],
  ['Asynchronous JavaScript', /async|promise|await/i, [
    ['What does an async function always return?', ['A Promise', 'A DOM element', 'A plain integer only', 'A database'], 0, 'async functions wrap their return values in a Promise.'],
    ['What does await do?', ['Pauses the async function until a Promise settles', 'Blocks all browser rendering forever', 'Deletes a Promise', 'Converts a string to HTML'], 0, 'await suspends that async function while other event-loop work can continue.'],
    ['How can an awaited rejection be handled?', ['try/catch', 'Only CSS', 'A label element', 'Setting a font'], 0, 'An awaited rejected Promise throws, so try/catch can handle it.'],
    ['What does Promise.all do if any input Promise rejects?', ['Rejects with that rejection', 'Always resolves all results', 'Ignores the error', 'Returns only a string'], 0, 'Promise.all rejects when an input rejects.'],
    ['Which call schedules a callback after a delay?', ['setTimeout', 'JSON.parse', 'Array.filter', 'Math.round'], 0, 'setTimeout schedules a timer callback; the delay is a minimum, not an exact guarantee.'],
  ]],
  ['React fundamentals', /react|components?|frontend|front-end/i, [
    ['How should React state be updated?', ['Through its state setter', 'By mutating state silently', 'By editing the generated HTML file', 'Only by reloading'], 0, 'State setters tell React to schedule a render.'],
    ['What are props?', ['Inputs passed from a parent component', 'A database password', 'Only CSS classes', 'Browser cookies only'], 0, 'Props provide values and callbacks to child components.'],
    ['Why should list keys be stable?', ['To preserve item identity between renders', 'To hide errors', 'To encrypt the list', 'To make text bold'], 0, 'Keys let React match items across updates.'],
    ['When updating state from its previous value, what is useful?', ['A functional state updater', 'Direct array mutation', 'A global counter only', 'Changing the prop'], 0, 'A functional updater receives the previous state and avoids stale captured values.'],
    ['What should an effect that starts a subscription return?', ['A cleanup function', 'An HTML document', 'A database row', 'An unhandled error'], 0, 'Cleanup unsubscribes when the component unmounts or dependencies change.'],
  ]],
  ['JavaScript fundamentals', /javascript|\bjs\b/i, [
    ['Which declaration is block-scoped?', ['let', 'A bare assignment', 'window', 'document'], 0, 'let declares a block-scoped variable.'],
    ['What does === compare?', ['Value and type without coercion', 'Only string length', 'Only truthiness', 'Only object keys'], 0, 'Strict equality avoids the coercion performed by ==.'],
    ['What does JSON.parse do?', ['Parses JSON text into a JavaScript value', 'Executes arbitrary JavaScript', 'Hashes a string', 'Builds CSS'], 0, 'JSON.parse accepts JSON text and returns its represented value.'],
    ['Which method creates a transformed array?', ['map', 'push', 'pop', 'shift'], 0, 'map returns a new array from a transformation of each item.'],
    ['What is the purpose of try/catch?', ['Handling thrown errors', 'Styling an element', 'Defining a database index', 'Creating an HTML form'], 0, 'try/catch handles exceptions thrown during execution of the try block.'],
  ]],
  ['Git workflow', /git|branches?|commits?|developer workflow/i, [
    ['What does a Git commit record?', ['A snapshot of staged changes', 'All remote passwords', 'Only installed packages', 'Browser history'], 0, 'A commit records the staged project state with metadata.'],
    ['Which command stages a file?', ['git add', 'git log', 'git status', 'git branch'], 0, 'git add puts changes into the staging area.'],
    ['What does git status show?', ['Working tree and staging state', 'Only production uptime', 'Only remote users', 'Only compiler output'], 0, 'git status reports staged, modified, and untracked files.'],
    ['What should happen before resolving a merge conflict?', ['Understand both sets of changes', 'Delete the repository', 'Always keep only your own version', 'Publish credentials'], 0, 'Conflict resolution must preserve the intended behavior of both changes.'],
    ['Why use a .gitignore file?', ['To exclude local or generated files from normal tracking', 'To encrypt tracked secrets', 'To remove committed history automatically', 'To deploy the app'], 0, '.gitignore helps keep generated files and local secrets out of new commits.'],
  ]],
  ['Backend and API fundamentals', /node|express|rest|authentication|deployment|http|api/i, [
    ['Which HTTP status normally means unauthenticated?', ['401', '200', '201', '404'], 0, '401 indicates that valid authentication is required.'],
    ['Why validate request bodies on the server?', ['Clients can send arbitrary or malformed input', 'The browser always guarantees valid data', 'To replace authentication', 'To hide every response'], 0, 'The server must enforce its own input contracts.'],
    ['What is middleware in Express?', ['A function in the request-response pipeline', 'Only a database index', 'A CSS stylesheet', 'A client-only component'], 0, 'Middleware can process requests, send responses, or pass control onward.'],
    ['Where should a private API key be stored?', ['In the server environment', 'In a public Vite variable', 'In browser HTML', 'In a public repository'], 0, 'Frontend build variables are public; private credentials stay server-side.'],
    ['Which HTTP method normally retrieves data?', ['GET', 'DELETE', 'PATCH', 'PUT'], 0, 'GET is used to retrieve a representation.'],
  ]],
  ['MongoDB fundamentals', /mongo|documents?|collections?/i, [
    ['What is a collection in MongoDB?', ['A group of documents', 'A CSS layout', 'A browser tab', 'A function call'], 0, 'Collections group documents within a database.'],
    ['What does $set do in an update?', ['Sets specified fields', 'Deletes the database', 'Only sorts results', 'Removes every index'], 0, '$set changes the values of the specified fields.'],
    ['Why create a unique index on email?', ['To enforce uniqueness even during concurrent requests', 'Only to change the display name', 'To encrypt email', 'To disable all writes'], 0, 'A database unique index protects uniqueness beyond application checks.'],
    ['What should user-owned queries include?', ['The authenticated user identifier', 'Only the requested document id', 'A client-supplied admin flag', 'A public password'], 0, 'Ownership filters prevent one user from accessing another user data.'],
    ['What is an index commonly used for?', ['Speeding up matching queries', 'Replacing backups', 'Rendering React', 'Setting HTTP headers'], 0, 'Indexes accelerate supported reads at the cost of storage and write work.'],
  ]],
  ['SQL fundamentals', /sql|dbms|data querying/i, [
    ['Which clause filters rows before grouping?', ['WHERE', 'ORDER BY', 'HAVING', 'LIMIT'], 0, 'WHERE filters source rows before aggregates are calculated.'],
    ['What does an INNER JOIN return?', ['Rows with matching keys in both inputs', 'Every row from both inputs without matching', 'Only column names', 'Only unmatched rows'], 0, 'An inner join retains rows satisfying the join condition.'],
    ['What does COUNT(*) count?', ['Rows in the group', 'Only non-null values in one column', 'Only distinct strings', 'Only indexes'], 0, 'COUNT(*) counts rows, including those with null column values.'],
    ['How should untrusted values enter SQL queries?', ['As bound parameters', 'Through raw string concatenation', 'As table names without validation', 'Through CSS'], 0, 'Parameter binding separates values from SQL syntax.'],
    ['Which clause filters groups after aggregation?', ['HAVING', 'WHERE only', 'FROM', 'JOIN only'], 0, 'HAVING filters aggregate groups.'],
  ]],
  ['Python fundamentals', /python|object-oriented|\boop\b/i, [
    ['What defines a code block in Python?', ['Indentation', 'Only braces', 'Only semicolons', 'HTML tags'], 0, 'Python uses indentation to structure blocks.'],
    ['Which Python collection is mutable?', ['list', 'tuple', 'str', 'frozenset'], 0, 'A list can change its elements after creation.'],
    ['Which keyword defines a function?', ['def', 'function', 'func', 'define'], 0, 'Python functions are introduced with def.'],
    ['What is self in a normal instance method?', ['A reference to the instance', 'A global database', 'A required reserved keyword', 'A module filename'], 0, 'By convention self names the instance argument passed to instance methods.'],
    ['Which syntax catches an exception?', ['try/except', 'try/catch', 'select/where', 'if/error'], 0, 'Python handles exceptions with try and except.'],
  ]],
  ['Machine learning foundations', /learning|regression|classification|evaluation|feature|tuning|model|\bml\b|prediction/i, [
    ['Why keep a test dataset separate?', ['To estimate performance on unseen data', 'To repeatedly tune every model on it', 'To train on every row', 'To guarantee perfect accuracy'], 0, 'A held-out test set estimates generalization after model choices are made.'],
    ['What is data leakage?', ['Using information unavailable at prediction time', 'Removing duplicate rows', 'Adding a valid feature', 'Recording model versions'], 0, 'Leakage gives the model information that will not be available for real predictions.'],
    ['What does overfitting mean?', ['Learning training details that generalize poorly', 'Having no training data', 'Never using labels', 'Always using a simple baseline'], 0, 'An overfit model performs well on training data but worse on unseen examples.'],
    ['What is supervised learning based on?', ['Examples with target labels', 'Only CSS selectors', 'No training examples', 'Only unlabeled examples'], 0, 'Supervised learning learns a mapping from inputs to known target values.'],
    ['Why compare against a baseline?', ['To verify that added complexity improves results', 'To avoid evaluating the model', 'To guarantee zero errors', 'To replace the dataset'], 0, 'A baseline establishes a simple reference for meaningful improvement.'],
  ]],
  ['Algorithms and data structures', /algorithm|big-o|arrays?|strings?|sort|search|linked|stack|queue|recursion|backtracking|tree|graph|heap|greedy|dynamic programming|interview|core cs/i, [
    ['What is the time complexity of binary search on a sorted random-access array?', ['O(log n)', 'O(n²)', 'O(n!)', 'O(2ⁿ)'], 0, 'Binary search halves the remaining interval at each step.'],
    ['Which data structure uses FIFO order?', ['Queue', 'Stack', 'Binary search tree', 'Hash set'], 0, 'A queue processes the first inserted item first.'],
    ['Which data structure uses LIFO order?', ['Stack', 'Queue', 'Sorted array only', 'Graph only'], 0, 'A stack processes the most recently pushed item first.'],
    ['Why does graph traversal commonly use a visited set?', ['To avoid revisiting nodes and cycles indefinitely', 'To sort every edge', 'To guarantee positive weights', 'To replace all edges'], 0, 'Tracking visited nodes prevents repeated work and infinite traversal through cycles.'],
    ['When is memoization useful?', ['When subproblems repeat', 'Only when there is no state', 'Only for CSS', 'When every answer must be random'], 0, 'Memoization caches repeated subproblem results.'],
  ]],
  ['Software project practice', /project|testing|debugging|presentation|portfolio/i, [
    ['What should a good regression test demonstrate?', ['A previous failure is prevented', 'Only that a file exists', 'Only that an implementation detail is repeated', 'Only that a variable has a name'], 0, 'Regression tests exercise the behavior that was previously broken.'],
    ['What is useful when reproducing a bug?', ['Exact steps and expected versus actual behavior', 'Only a screenshot of the logo', 'Changing unrelated code first', 'Ignoring logs'], 0, 'A precise reproduction lets you verify both the cause and the fix.'],
    ['How should a project README help a new developer?', ['Explain setup, configuration, and usage', 'Contain private passwords', 'Only list colors', 'Replace all source code'], 0, 'A README should let someone run and understand the project.'],
    ['What should happen after a deployment?', ['Check health and important user flows', 'Assume the build proves every flow', 'Delete all logs', 'Publish environment secrets'], 0, 'A deployed smoke check verifies runtime configuration and core behavior.'],
    ['Why define a measurable project goal?', ['To know whether the project solves the intended problem', 'To guarantee unlimited scope', 'To avoid feedback', 'To eliminate testing'], 0, 'A measurable goal guides scope and evaluation.'],
  ]],
];

export function curatedQuiz(title) {
  const set = sets.find(([, pattern]) => pattern.test(title));
  if (!set) return null;
  return { focus: set[0], questions: set[2].map(([prompt, options, correctIndex, explanation]) => ({ prompt, options, correctIndex, explanation })) };
}
