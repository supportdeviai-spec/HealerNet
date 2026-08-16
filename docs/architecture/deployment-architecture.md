# 🚀 Deployment Architecture & Infrastructure

## Production Stack on AWS

```
               [ User Request / HTTPS ]
                          |
                          v
                 [ AWS CloudFront CDN ]
                          |
                          v
                [ AWS Application Load Balancer ]
                          |
                 +--------+--------+
                 |                 |
                 v                 v
           [ EC2 Node 1 ]    [ EC2 Node 2 ]
           (Docker/Nginx)    (Docker/Nginx)
                 |                 |
                 +--------+--------+
                          |
         +----------------+----------------+
         |                                 |
         v                                 v
[ AWS Aurora MySQL (Multi-AZ) ]   [ AWS ElastiCache Redis ]
```

## Production Highlights
- Zero-downtime deployment strategy.
- SSL Termination at AWS ALB / CloudFront.
- Health checks on `/api/health`.
