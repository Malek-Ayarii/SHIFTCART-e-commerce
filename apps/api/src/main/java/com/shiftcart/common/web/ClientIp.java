package com.shiftcart.common.web;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Adresse IP du client pour la limitation de débit.
 *
 * <p>On utilise {@code getRemoteAddr()}. Avec {@code server.forward-headers-strategy=native} (défaut), le
 * RemoteIpValve de Tomcat y place l'IP de {@code X-Forwarded-For} <b>seulement</b> si la requête vient d'un
 * proxy interne (boutique Next.js en Server Action, load balancer privé) : un client public ne peut pas
 * falsifier son IP. Pour un proxy à IP publique, régler {@code SERVER_TOMCAT_REMOTEIP_INTERNAL_PROXIES}.
 */
public final class ClientIp {

    private ClientIp() {}

    public static String of(HttpServletRequest request) {
        String ip = request.getRemoteAddr();
        return ip == null ? "unknown" : ip;
    }
}
