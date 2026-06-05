import { Star } from "lucide-react";

function ReviewCard({ review }) {
  return (
    <article className="review-card">
      <div className="review-head">
        <img src={review.image} alt={review.name} />
        <div>
          <h3>{review.name}</h3>
          <p>{review.service}</p>
        </div>
      </div>
      <p>{review.text}</p>
      <div className="stars" aria-label={`${review.rating} star rating`}>
        {Array.from({ length: review.rating }).map((_, index) => (
          <Star key={index} size={16} fill="currentColor" />
        ))}
      </div>
    </article>
  );
}

export default ReviewCard;
