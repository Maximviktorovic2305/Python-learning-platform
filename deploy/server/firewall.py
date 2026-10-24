#!/usr/bin/python3 -I
"""Restrict local service accounts; never alter SSH, nginx, UFW or administrator traffic."""

import pwd
import subprocess

POLICIES = {
    "music-web": ([3007], False, True),
    "music-api": ([5432], True, False),
    "chat-web": ([4568], False, True),
    "chat-api": ([5432], True, False),
    "portfolio-web": ([], False, False),
    "python-web": ([8011], False, False),
    "python-api": ([5433, 8091], False, False),
    "python-runner": ([], False, False),
    "jslab-web": ([8020], False, False),
    "jslab-api": ([5432, 8092], False, False),
    "jslab-runner": ([], False, False),
}
for binary, version in [("/usr/sbin/iptables", 4), ("/usr/sbin/ip6tables", 6)]:

    def rule(*args, check=True, binary=binary):
        return subprocess.run(
            [binary, "-w", "5", *args],
            check=check,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    chain = "NATIVE_SITES_OUT"
    rule("-N", chain, check=False)
    rule("-F", chain)
    for user, (ports, internet, self_https) in POLICIES.items():
        uid = pwd.getpwnam(user).pw_uid
        sub = "NF_SITE_" + str(uid)
        rule("-N", sub, check=False)
        rule("-F", sub)
        rule(
            "-A",
            sub,
            "-m",
            "conntrack",
            "--ctstate",
            "ESTABLISHED,RELATED",
            "-j",
            "RETURN",
        )
        if version == 4:
            for port in ports:
                rule(
                    "-A",
                    sub,
                    "-d",
                    "127.0.0.1",
                    "-p",
                    "tcp",
                    "--dport",
                    str(port),
                    "-j",
                    "RETURN",
                )
            if ports or internet or self_https:
                for proto in ["udp", "tcp"]:
                    rule(
                        "-A",
                        sub,
                        "-d",
                        "127.0.0.53",
                        "-p",
                        proto,
                        "--dport",
                        "53",
                        "-j",
                        "RETURN",
                    )
            if self_https:
                rule(
                    "-A",
                    sub,
                    "-d",
                    "212.193.56.213",
                    "-p",
                    "tcp",
                    "--dport",
                    "443",
                    "-j",
                    "RETURN",
                )
            private = [
                "0.0.0.0/8",
                "10.0.0.0/8",
                "100.64.0.0/10",
                "127.0.0.0/8",
                "169.254.0.0/16",
                "172.16.0.0/12",
                "192.168.0.0/16",
                "224.0.0.0/4",
                "240.0.0.0/4",
            ]
        else:
            private = ["::/128", "::1/128", "fc00::/7", "fe80::/10", "ff00::/8"]
        for block in private:
            rule("-A", sub, "-d", block, "-j", "REJECT")
        if internet:
            for port in [443, 465, 587]:
                rule("-A", sub, "-p", "tcp", "--dport", str(port), "-j", "RETURN")
        rule("-A", sub, "-j", "REJECT")
        rule("-A", chain, "-m", "owner", "--uid-owner", str(uid), "-j", sub)
    rule("-A", chain, "-j", "RETURN")
    if rule("-C", "OUTPUT", "-j", chain, check=False).returncode:
        rule("-I", "OUTPUT", "1", "-j", chain)
print("Native service UID network isolation installed for IPv4 and IPv6")
