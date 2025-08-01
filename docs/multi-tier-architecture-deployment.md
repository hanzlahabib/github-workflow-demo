# Multi-Tier Video Processing Architecture - Deployment Guide

## Overview

This guide covers the deployment of a comprehensive multi-tier video processing system designed to handle videos up to 300MB+ while maintaining cost efficiency and performance.

## Architecture Components

### Tier 1: Small Videos (<50MB) - Standard Lambda
- **Service**: AWS Lambda (2GB RAM, 2min timeout)
- **Use Case**: Quick processing of small videos
- **Cost**: $0.01-0.05 per request
- **Processing Time**: 30 seconds - 2 minutes

### Tier 2: Medium Videos (50-150MB) - Enhanced Lambda  
- **Service**: AWS Lambda (3008MB RAM, 10min timeout)
- **Use Case**: Optimized processing with preprocessing
- **Cost**: $0.05-0.25 per request
- **Processing Time**: 2-10 minutes

### Tier 3: Large Videos (150MB+) - ECS Fargate
- **Service**: AWS ECS Fargate (8GB RAM, 2 vCPU, unlimited time)
- **Use Case**: Extended processing for large videos
- **Cost**: $0.15-0.45 per request
- **Processing Time**: 5-15 minutes

## Prerequisites

### AWS Services Required
- AWS Lambda (existing)
- AWS ECS Fargate (new)
- AWS S3 (existing)
- AWS VPC with subnets (new)
- AWS CloudWatch (monitoring)

### Environment Variables
```bash
# ECS Configuration
ECS_CLUSTER_NAME=reelspeed-video-cluster
ECS_TASK_DEFINITION=reelspeed-video-processor
ECS_SUBNETS=subnet-12345,subnet-67890
ECS_SECURITY_GROUPS=sg-abcdef123

# Enhanced Lambda Configuration  
LAMBDA_FUNCTION_NAME_ENHANCED=remotion-render-enhanced-mem3008mb-600sec
LAMBDA_SITE_URL_ENHANCED=https://your-enhanced-lambda-site.s3.amazonaws.com/
```

## Step 1: Deploy ECS Infrastructure

### 1.1 Create ECS Cluster
```bash
aws ecs create-cluster \
  --cluster-name reelspeed-video-cluster \
  --capacity-providers FARGATE \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1
```

### 1.2 Create Task Definition
```json
{
  "family": "reelspeed-video-processor",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "8192",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::YOUR_ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "video-processor",
      "image": "your-account.dkr.ecr.us-east-1.amazonaws.com/reelspeed-video-processor:latest",
      "cpu": 2048,
      "memory": 8192,
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/reelspeed-video-processor",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "AWS_REGION", "value": "us-east-1"}
      ]
    }
  ]
}
```

### 1.3 Register Task Definition
```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

## Step 2: Create VPC Resources

### 2.1 Create VPC
```bash
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=reelspeed-vpc}]'
```

### 2.2 Create Subnets
```bash
# Public Subnet 1
aws ec2 create-subnet \
  --vpc-id vpc-12345678 \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=reelspeed-public-1}]'

# Public Subnet 2  
aws ec2 create-subnet \
  --vpc-id vpc-12345678 \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=reelspeed-public-2}]'
```

### 2.3 Create Security Group
```bash
aws ec2 create-security-group \
  --group-name reelspeed-ecs-sg \
  --description "Security group for ReelSpeed ECS tasks" \
  --vpc-id vpc-12345678
```

## Step 3: Build and Deploy Container Image

### 3.1 Create Dockerfile for ECS
```dockerfile
FROM node:18-alpine

# Install FFmpeg for video processing
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 8080

# Start application
CMD ["node", "dist/workers/ecsVideoWorker.js"]
```

### 3.2 Build and Push to ECR
```bash
# Create ECR repository
aws ecr create-repository --repository-name reelspeed-video-processor

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t reelspeed-video-processor .

# Tag image
docker tag reelspeed-video-processor:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/reelspeed-video-processor:latest

# Push image
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/reelspeed-video-processor:latest
```

## Step 4: Deploy Enhanced Lambda

### 4.1 Create Enhanced Lambda Function
```bash
# Create function with higher memory and timeout
aws lambda create-function \
  --function-name remotion-render-enhanced-mem3008mb-600sec \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://enhanced-lambda.zip \
  --memory-size 3008 \
  --timeout 600 \
  --environment Variables='{
    "NODE_ENV":"production",
    "PROCESSING_TIER":"2",
    "MAX_PROCESSING_TIME":"600000"
  }'
```

### 4.2 Configure Lambda Layers
```bash
# Add FFmpeg layer for video processing
aws lambda update-function-configuration \
  --function-name remotion-render-enhanced-mem3008mb-600sec \
  --layers arn:aws:lambda:us-east-1:YOUR_ACCOUNT:layer:ffmpeg:1
```

## Step 5: Update Backend Configuration

### 5.1 Environment Variables
```bash
# Add to your .env file
ECS_CLUSTER_NAME=reelspeed-video-cluster
ECS_TASK_DEFINITION=reelspeed-video-processor
ECS_SUBNETS=subnet-12345,subnet-67890
ECS_SECURITY_GROUPS=sg-abcdef123

# Enhanced Lambda
LAMBDA_FUNCTION_NAME_ENHANCED=remotion-render-enhanced-mem3008mb-600sec
LAMBDA_SITE_URL_ENHANCED=https://your-enhanced-lambda-site.s3.amazonaws.com/

# Monitoring
ENABLE_VIDEO_MONITORING=true
MONITORING_ALERT_WEBHOOK=https://your-alerts-webhook.com
```

### 5.2 Update Routes
Add the new video processing routes to your main router:

```typescript
// src/server.ts
import videoProcessingRoutes from './routes/videoProcessing';

app.use('/api/video-processing', videoProcessingRoutes);
```

## Step 6: Monitoring and Alerting

### 6.1 CloudWatch Alarms
```bash
# ECS CPU Utilization
aws cloudwatch put-metric-alarm \
  --alarm-name "ReelSpeed-ECS-HighCPU" \
  --alarm-description "ECS CPU utilization is high" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=reelspeed-video-processor \
  --evaluation-periods 2

# Lambda Error Rate
aws cloudwatch put-metric-alarm \
  --alarm-name "ReelSpeed-Lambda-HighErrors" \
  --alarm-description "Lambda error rate is high" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=remotion-render-enhanced-mem3008mb-600sec \
  --evaluation-periods 1
```

### 6.2 Custom Metrics Dashboard
```bash
# Create custom dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "ReelSpeed-Video-Processing" \
  --dashboard-body file://dashboard-config.json
```

## Cost Analysis

### Monthly Cost Estimates (1000 requests)

#### Tier 1 (Small Videos - 60% of requests)
- **Lambda**: 600 requests × $0.025 avg = $15.00
- **S3 Storage**: ~$2.00
- **Total Tier 1**: $17.00

#### Tier 2 (Medium Videos - 30% of requests)  
- **Enhanced Lambda**: 300 requests × $0.15 avg = $45.00
- **S3 Storage**: ~$3.00
- **Total Tier 2**: $48.00

#### Tier 3 (Large Videos - 10% of requests)
- **ECS Fargate**: 100 requests × $0.30 avg = $30.00
- **S3 Storage**: ~$2.00
- **Total Tier 3**: $32.00

### Total Monthly Cost: ~$97.00
**Cost per request**: ~$0.097 average

### Cost Optimization Strategies

1. **Smart Routing**: Use size detection to avoid over-provisioning
2. **Preprocessing**: Optimize videos before processing
3. **Caching**: Cache processed videos to avoid reprocessing
4. **Scheduling**: Use spot instances for ECS during off-peak hours
5. **Auto-scaling**: Scale down resources during low usage

## Performance Targets

### Response Times
- **Tier 1**: 30-120 seconds (95th percentile)
- **Tier 2**: 2-10 minutes (95th percentile)  
- **Tier 3**: 5-15 minutes (95th percentile)

### Availability
- **Overall**: 99.5% uptime
- **Error Rate**: <2% across all tiers
- **Timeout Rate**: <1% per tier

### Scalability
- **Concurrent Requests**: 50+ (auto-scaling)
- **Peak Throughput**: 200 requests/hour
- **Queue Depth**: <20 requests during peak

## Monitoring Checklist

- [ ] ECS cluster health checks
- [ ] Lambda timeout and error monitoring  
- [ ] S3 storage usage and costs
- [ ] Video processing success rates
- [ ] Average processing times per tier
- [ ] Cost per request tracking
- [ ] Queue depth monitoring
- [ ] User experience metrics

## Troubleshooting

### Common Issues

1. **ECS Task Failures**
   - Check task logs in CloudWatch
   - Verify container image and task definition
   - Ensure adequate CPU/memory allocation

2. **Lambda Timeouts**  
   - Monitor CloudWatch metrics
   - Check video size and complexity
   - Verify preprocessing is working

3. **High Costs**
   - Review tier routing decisions
   - Check for stuck or long-running tasks
   - Optimize video preprocessing

4. **Poor Performance**
   - Monitor resource utilization
   - Check network connectivity
   - Review video optimization settings

## Next Steps

1. Deploy infrastructure components
2. Test with small batch of videos
3. Monitor performance and costs
4. Optimize routing algorithms
5. Scale up gradually
6. Implement advanced features (auto-scaling, spot instances)

For support, check the monitoring dashboard and alert logs first, then review this deployment guide.