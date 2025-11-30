# ML Prediction Interpretation Guide

## Overview

The Fabricator Pro system uses machine learning to predict remnant reuse likelihood. This guide explains how to interpret these predictions and use them effectively.

## Understanding Prediction Scores

### Reuse Likelihood Score (0-100)

The reuse likelihood score indicates how likely a remnant is to be reused in future projects:

- **90-100**: Very High - Excellent candidate for reuse
- **70-89**: High - Good candidate for reuse
- **50-69**: Moderate - May be reused, but not prioritized
- **30-49**: Low - Unlikely to be reused soon
- **0-29**: Very Low - Consider disposal or recycling

### Confidence Level (0-100)

The confidence level indicates how reliable the prediction is:

- **80-100**: High Confidence - Prediction is very reliable
- **60-79**: Medium Confidence - Prediction is reasonably reliable
- **40-59**: Low Confidence - Prediction should be used with caution
- **0-39**: Very Low Confidence - Consider using rule-based prediction instead

## Factors Affecting Predictions

### 1. Remnant Length

- **Longer remnants** (3000mm+) tend to have higher reuse likelihood
- **Shorter remnants** (< 1000mm) may have lower scores unless they match common cut lengths

### 2. Age

- **Newer remnants** (< 30 days) typically score higher
- **Older remnants** (> 90 days) may score lower unless they're in high demand

### 3. Profile Type Frequency

- **Common profiles** used frequently score higher
- **Rare profiles** may score lower unless they match current demand

### 4. Seasonal Demand

- **Peak season** (spring/summer) increases scores
- **Off-season** (winter) may decrease scores

### 5. Location Priority

- **Main location** remnants score higher
- **Storage locations** may score slightly lower

### 6. Quality Score

- **Excellent/Good quality** remnants score higher
- **Fair/Poor quality** remnants score lower

### 7. Usage History

- **Frequently used** remnant types score higher
- **Rarely used** types score lower

## Interpreting Prediction Results

### Example 1: High Confidence, High Score

```
Reuse Likelihood: 85
Confidence: 90
Model Version: 1.0.0
Fallback Used: No

Factors:
- ML Score: 88
- Rule-Based Score: 80
- Final Score: 85
```

**Interpretation**: This remnant is very likely to be reused. The ML model is highly confident in this prediction. Consider prioritizing this remnant for matching.

### Example 2: Low Confidence, Moderate Score

```
Reuse Likelihood: 55
Confidence: 45
Model Version: rule-based
Fallback Used: Yes

Factors:
- ML Score: 0
- Rule-Based Score: 55
- Final Score: 55
```

**Interpretation**: The ML model couldn't make a confident prediction, so the system fell back to rule-based prediction. The score is moderate, but should be used with caution.

### Example 3: High Score, Low Confidence

```
Reuse Likelihood: 75
Confidence: 50
Model Version: 1.0.0
Fallback Used: No

Factors:
- ML Score: 80
- Rule-Based Score: 70
- Final Score: 75
```

**Interpretation**: The prediction suggests good reuse likelihood, but confidence is low. This may indicate insufficient training data for this remnant type. Consider manual review.

## Using Predictions in Decision Making

### For Remnant Matching

1. **Prioritize High-Score Remnants**: When matching cuts to remnants, prioritize those with scores > 70
2. **Consider Confidence**: High-confidence predictions are more reliable
3. **Review Low-Confidence Predictions**: Manually review predictions with confidence < 60

### For Inventory Management

1. **Disposal Decisions**: Consider disposing remnants with scores < 30 that are > 180 days old
2. **Storage Optimization**: Store high-score remnants in easily accessible locations
3. **Reordering**: Use prediction trends to inform material reordering

### For Project Planning

1. **Material Availability**: Check prediction scores when planning projects
2. **Remnant Utilization**: Prioritize using high-score remnants in new projects
3. **Waste Reduction**: Use predictions to minimize waste by matching remnants effectively

## Model Versions

### ML Model (v1.0.0+)

- Uses machine learning for predictions
- Requires sufficient training data
- Provides confidence scores
- Blends ML and rule-based predictions

### Rule-Based Fallback

- Used when ML model is unavailable
- Based on historical patterns and rules
- Lower confidence scores
- Always available as backup

## Improving Prediction Accuracy

### For Users

1. **Accurate Data Entry**: Ensure remnant data is accurate and complete
2. **Regular Updates**: Update remnant status promptly
3. **Feedback**: Report when predictions are inaccurate

### For System

1. **Training Data**: More historical data improves predictions
2. **Feature Engineering**: Better features lead to better predictions
3. **Model Updates**: Regular model retraining improves accuracy

## Common Questions

### Q: Why is my remnant's score low even though it's new?

A: Several factors affect scores. A new remnant might score lower if:
- It's a rare profile type
- It's in an inconvenient location
- Historical data shows low demand for this profile

### Q: Should I always use the highest-scoring remnant?

A: Not necessarily. Consider:
- Project requirements
- Location accessibility
- Quality requirements
- Confidence level

### Q: What if the prediction seems wrong?

A: The system learns from usage patterns. If a prediction seems incorrect:
- Check if all remnant data is accurate
- Consider that the model may need more training data
- Use your judgment for critical decisions

### Q: How often are predictions updated?

A: Predictions are calculated in real-time based on current data. The underlying model is retrained periodically with new data.

## Best Practices

1. **Use Predictions as Guidance**: Don't rely solely on predictions; use them as one factor in decision-making
2. **Review Low-Confidence Predictions**: Always review predictions with confidence < 60
3. **Provide Feedback**: Report inaccurate predictions to help improve the model
4. **Keep Data Accurate**: Accurate data leads to better predictions
5. **Monitor Trends**: Watch for trends in prediction scores over time

## Technical Details

### Model Architecture

- **Type**: Neural Network (TensorFlow.js)
- **Input Features**: 8 features (length, age, frequency, etc.)
- **Output**: Reuse likelihood score (0-100)
- **Training**: Supervised learning on historical data

### Prediction Process

1. Extract features from remnant data
2. Normalize features to 0-1 range
3. Run through ML model (if available and confident)
4. Blend with rule-based prediction
5. Return final score and confidence

### Fallback Mechanism

If ML model is unavailable or confidence is low:
1. Use rule-based prediction
2. Set confidence to 50
3. Mark as fallback used
4. Still provide useful guidance

## Support

For questions about ML predictions:
- Check this guide first
- Contact support with specific examples
- Provide feedback to improve the system

