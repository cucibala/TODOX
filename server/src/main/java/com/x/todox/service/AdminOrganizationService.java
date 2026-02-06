package com.x.todox.service;

import com.x.todox.entity.Organization;
import com.x.todox.repository.OrganizationRepository;
import java.util.UUID;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminOrganizationService {

    private final OrganizationRepository organizationRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AdminOrganizationService(OrganizationRepository organizationRepository) {
        this.organizationRepository = organizationRepository;
    }

    @Transactional
    public Organization createOrganization(String name, String account) {
        if (organizationRepository.findByAccount(account).isPresent()) {
            throw new IllegalArgumentException("组织账号已存在");
        }

        Organization organization = new Organization();
        organization.setName(name);
        organization.setAccount(account);
        organization.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        return organizationRepository.save(organization);
    }
}
