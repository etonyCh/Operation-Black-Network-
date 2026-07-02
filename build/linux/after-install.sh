#!/bin/bash
# Post-install script for Black Network

# Set capabilities so the app doesn't need root to capture packets or run nmap
setcap cap_net_raw,cap_net_admin,cap_dac_override+eip /usr/bin/nmap || true
setcap cap_net_raw,cap_net_admin+eip /usr/bin/tshark || true
setcap cap_net_raw,cap_net_admin+eip /usr/bin/dumpcap || true

# Create wireshark group if it doesn't exist
if ! getent group wireshark > /dev/null 2>&1; then
    groupadd wireshark || true
fi

# Add the user to the wireshark group just in case (the logged-in user who ran sudo apt install)
if [ ! -z "$SUDO_USER" ]; then
    usermod -a -G wireshark $SUDO_USER || true
fi

# Fix chrome-sandbox permissions for SUID sandbox support
chmod 4755 "/opt/BlackNetwork/chrome-sandbox" || true
