package com.branchstock.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

/**
 * SPA fallback for the React front-end when served by the Spring Boot jar.
 *
 * <p>The production jar serves the built React/Vite SPA from classpath:/static
 * alongside the REST API. The UI uses react-router BrowserRouter, so a refresh
 * or direct navigation on a client route (/login, /products, /products/123)
 * has no matching file and would otherwise 404. This controller forwards such
 * GET requests to /index.html so the client router renders the correct view.
 *
 * <p>Spring Boot resolves /api/** via the @RestController beans (more specific
 * than this catch-all) and static assets (/assets/*.js, *.css, favicon.ico) via
 * its ResourceHttpRequestHandler, ordered ahead of this controller; existing
 * assets are served rather than replaced. The path-variable regex contains no
 * dot, so only real client-side route segments are matched.
 */
@Controller
public class SpaFallbackController {

        /**
     * Catches every genuine client-side route and forwards it to /index.html so
     * react-router can render it. The path variable matches the FIRST segment
     * only when it:
     *   - contains no dot (so file requests like /favicon.svg, /index.html are
     *     left to the resource handler), and
     *   - is NOT a static-asset prefix (assets|css|js|img|static|webjars|resources)
     *     or the api prefix -- otherwise the SPA fallback would shadow the real
     *     static /api resources and React would never load.
     *
     * @RequestMapping(HandlerMapping) is more specific than the generic resource
     * handler for the path it matches, and the {@code @RestController} API
     * mappings are more specific for /api/**, so neither static files nor REST
     * endpoints are affected.
     */
    @RequestMapping(value = "/{spring:(?!api|assets|css|js|img|static|webjars|resources|favicon)[a-z0-9_-]+}/**", method = RequestMethod.GET)
    public String forward() {
        return "forward:/index.html";
    }
}