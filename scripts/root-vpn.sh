#!/bin/bash

# Exit on error
set -e

# Copy ./wg0.conf to /etc/wireguard/wg0.conf
install ./wg0.conf /etc/wireguard/wg0.conf

# Enable and start the WireGuard service
systemctl enable --now wg-quick@wg0

# Enable IP forwarding
sysctl -w net.ipv4.ip_forward=1
sysctl -w net.ipv6.conf.all.forwarding=1
sysctl --system

# Remove the WireGuard configuration file
rm ./wg0.conf

echo "WireGuard VPN is now running."
