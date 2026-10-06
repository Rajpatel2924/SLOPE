import { useEffect, useRef } from 'react';
import ErrorMessage from './ErrorMessage.jsx';
import Loader from './Loader.jsx';

const suggestions = ['Explain this topic simply', 'Give me a practice problem', 'Common mistakes?'];

function MessageContent({ content }) {
  return content.split(/(```[\s\S]*?```)/g).filter(Boolean).map((part, index) => {
    const code = part.match(/^```[^\n]*\n([\s\S]*?)```$/);
    return code ? (
      <pre key={index} tabIndex={0} className="my-3 max-w-full overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100"><code>{code[1]}</code></pre>
    ) : <p key={index} className="whitespace-pre-wrap text-sm leading-relaxed">{part}</p>;
  });
}

export default function ChatWindow({ messages, sending, value, onChange, onSend, error, inputRef }) {
  const transcript = useRef(null);

  useEffect(() => {
    if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [messages, sending]);

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!sending && value.trim()) onSend();
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div ref={transcript} role="log" aria-label="Study conversation" aria-live="polite" aria-relevant="additions" tabIndex={0} className="chat-transcript space-y-4 border-b border-slate-200 p-4 sm:p-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-lg font-bold text-slate-800">Let’s work through a doubt</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">Ask about your current topic, or choose a prompt below to get started.</p>
          </div>
        )}
        {messages.map((message, index) => (
          <div key={message.id || `${message.role}-${message.at}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <article aria-label={message.role === 'user' ? 'Your message' : 'SLOPE reply'} className={`min-w-0 max-w-[90%] rounded-2xl p-4 sm:max-w-[85%] ${message.role === 'user' ? 'bg-indigo-700 text-white' : 'border border-slate-200 bg-slate-50 text-slate-800'}`}>
              <p className={`mb-2 text-xs font-bold ${message.role === 'user' ? 'text-indigo-100' : 'text-indigo-700'}`}>{message.role === 'user' ? 'You' : 'SLOPE'}</p>
              <MessageContent content={message.content} />
              <time dateTime={message.at} className={`mt-2 block text-xs ${message.role === 'user' ? 'text-indigo-100' : 'text-slate-500'}`}>{new Date(message.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
            </article>
          </div>
        ))}
        {sending && <div className="w-fit rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2"><Loader message="SLOPE is thinking..." compact /></div>}
      </div>
      <form className="space-y-4 p-4 sm:p-6" aria-busy={sending} onSubmit={(event) => { event.preventDefault(); onSend(); }}>
        {error && <div className="space-y-2"><p className="text-sm text-slate-600">Your question is back in the box below. You can edit it or try again.</p><ErrorMessage error={error} onRetry={sending ? undefined : onSend} /></div>}
        <div className="flex flex-wrap gap-2" aria-label="Suggested questions">
          {suggestions.map((suggestion) => <button key={suggestion} type="button" disabled={sending} onClick={() => { onChange(suggestion); inputRef.current?.focus(); }} className="min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60">{suggestion}</button>)}
        </div>
        <div>
          <label htmlFor="study-question" className="label">Your question</label>
          <textarea ref={inputRef} id="study-question" rows={3} maxLength={2000} value={value} disabled={sending} onChange={(event) => onChange(event.target.value)} onKeyDown={handleKeyDown} aria-describedby="question-help" className="field max-h-64 min-h-24 resize-y" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500"><p id="question-help">Enter to send · Shift+Enter for a new line</p><p className="mt-1">{value.length}/2,000 characters</p></div>
          <button type="submit" disabled={sending || !value.trim()} className="btn btn-primary">{sending ? 'Waiting for reply...' : 'Send question →'}</button>
        </div>
      </form>
    </div>
  );
}
