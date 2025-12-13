import quotes from '../assets/quotes.json';
//import './QuoteBanner.css'; // Optional for styling

const QuoteBanner = () => {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const selected = quotes[randomIndex];

    return (
        <div className="quote-banner">
            <blockquote>“{selected.quote}”</blockquote>
            <cite>— {selected.author}</cite>
        </div>
    );
};

export default QuoteBanner;
