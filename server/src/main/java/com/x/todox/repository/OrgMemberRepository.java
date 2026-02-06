package com.x.todox.repository;

import com.x.todox.entity.OrgMember;
import com.x.todox.enums.MemberRole;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface OrgMemberRepository extends JpaRepository<OrgMember, String> {
    Optional<OrgMember> findByIdAndOrganizationId(String id, Long orgId);
    List<OrgMember> findByOrganizationId(Long orgId);
    long countByOrganizationIdAndRole(Long orgId, MemberRole role);
}
