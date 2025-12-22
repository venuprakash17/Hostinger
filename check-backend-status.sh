#!/bin/bash
# Commands to check backend status on server

echo "🔍 Run these commands on your server to diagnose:"
echo ""
echo "1. Check container status:"
echo "   ssh root@72.60.101.14 'cd /root/elevate-edu && docker-compose ps'"
echo ""
echo "2. Check backend logs:"
echo "   ssh root@72.60.101.14 'cd /root/elevate-edu && docker-compose logs --tail=50 backend'"
echo ""
echo "3. Check if backend is running inside container:"
echo "   ssh root@72.60.101.14 'docker exec elevate_edu_api curl -s http://localhost:8000/api/v1/health'"
echo ""
echo "4. Check port binding:"
echo "   ssh root@72.60.101.14 'netstat -tlnp | grep 8000'"
echo ""
echo "5. Check firewall:"
echo "   ssh root@72.60.101.14 'ufw status | grep 8000'"
echo ""

