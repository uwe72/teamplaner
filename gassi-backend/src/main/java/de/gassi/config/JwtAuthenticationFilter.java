package de.gassi.config;

import de.gassi.domain.Rolle;
import de.gassi.domain.Teammitglied;
import de.gassi.repository.TeammitgliedRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final TeammitgliedRepository teammitgliedRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
        throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            Optional<Claims> claims = jwtTokenProvider.leseClaims(token);
            if (claims.isPresent() && !jwtTokenProvider.istRefreshToken(claims.get())) {
                Long mitgliedId = jwtTokenProvider.mitgliedIdAus(claims.get());
                if (mitgliedId != null) {
                    Optional<Teammitglied> mitglied = teammitgliedRepository.findByIdMitTeam(mitgliedId);
                    mitglied.filter(Teammitglied::isAktiv).ifPresent(m -> {
                        Rolle rolle = m.getRolle();
                        UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(m, null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + rolle.name())));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    });
                }
            }
        }

        chain.doFilter(request, response);
    }
}
