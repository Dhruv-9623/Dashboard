package com.VentureCapitals.Dashboard.domain.pool;

import com.VentureCapitals.Dashboard.common.exception.BusinessRuleViolationException;
import com.VentureCapitals.Dashboard.common.exception.UnauthorizedException;
import com.VentureCapitals.Dashboard.common.exception.ValidationException;
import com.VentureCapitals.Dashboard.config.BaseUnitTest;
import com.VentureCapitals.Dashboard.domain.startup.Startup;
import com.VentureCapitals.Dashboard.domain.startup.StartupRepository;
import com.VentureCapitals.Dashboard.domain.user.User;
import com.VentureCapitals.Dashboard.domain.user.UserType;
import com.VentureCapitals.Dashboard.domain.vc.FirmAccessPolicy;
import com.VentureCapitals.Dashboard.domain.vc.VCFirm;
import com.VentureCapitals.Dashboard.domain.vc.VCMember;
import com.VentureCapitals.Dashboard.domain.vc.VCMemberRepository;
import com.VentureCapitals.Dashboard.domain.vc.VCRole;
import com.VentureCapitals.Dashboard.testdata.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;

import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PoolEntryServiceTest extends BaseUnitTest {

    @Mock
    private PoolEntryRepository poolEntryRepository;
    @Mock
    private StartupRepository startupRepository;
    @Mock
    private VCMemberRepository vcMemberRepository;

    private PoolEntryService service;
    private User actor;
    private VCFirm firm;
    private VCMember membership;

    @BeforeEach
    @Override
    public void setUp() {
        service = new PoolEntryService(poolEntryRepository, startupRepository, new FirmAccessPolicy(vcMemberRepository));
        actor = TestDataBuilder.user().withId(UUID.randomUUID()).withUserType(UserType.VC).build();
        firm = TestDataBuilder.vcFirm().build();
        firm.setId(UUID.randomUUID());
        membership = VCMember.builder().user(actor).firm(firm).role(VCRole.STAFF).build();
        when(vcMemberRepository.findByUserId(actor.getId())).thenReturn(Optional.of(membership));
    }

    @Test
    void on_platform_entry_ignores_the_submitted_name() {
        Startup startup = Startup.builder().name("Stackline AI").build();
        startup.setId(UUID.randomUUID());
        when(startupRepository.findById(startup.getId())).thenReturn(Optional.of(startup));
        when(poolEntryRepository.save(any(PoolEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        PoolEntry entry = service.createPoolEntry(actor, PoolEntryRequest.builder()
                .startupId(startup.getId()).companyName("Stackline AI").sector("AI/ML")
                .tags(Arrays.asList(" ai-infra ", "", "ai-infra")).interestLevel(InterestLevel.HIGH_PRIORITY).build());

        assertThat(entry.getStartup()).isSameAs(startup);
        assertThat(entry.getCompanyName()).as("DB check requires exactly one of startup / name").isNull();
        assertThat(entry.getTags()).containsExactly("ai-infra");
        assertThat(entry.getAddedBy()).isSameAs(membership);
    }

    @Test
    void same_startup_cannot_be_added_twice() {
        Startup startup = Startup.builder().name("Stackline AI").build();
        startup.setId(UUID.randomUUID());
        when(startupRepository.findById(startup.getId())).thenReturn(Optional.of(startup));
        when(poolEntryRepository.existsByVcFirmIdAndStartupId(firm.getId(), startup.getId())).thenReturn(true);

        assertThatThrownBy(() -> service.createPoolEntry(actor, PoolEntryRequest.builder()
                .startupId(startup.getId()).interestLevel(InterestLevel.WATCHING).build()))
                .isInstanceOf(BusinessRuleViolationException.class);
        verify(poolEntryRepository, never()).save(any());
    }

    @Test
    void off_platform_entry_needs_a_name() {
        assertThatThrownBy(() -> service.createPoolEntry(actor, PoolEntryRequest.builder()
                .companyName("   ").interestLevel(InterestLevel.WATCHING).build()))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void off_platform_entry_keeps_its_own_sector_and_stage() {
        when(poolEntryRepository.save(any(PoolEntry.class))).thenAnswer(inv -> inv.getArgument(0));

        PoolEntry entry = service.createPoolEntry(actor, PoolEntryRequest.builder()
                .companyName(" Nimbus Payroll ").sector("SaaS").stage("SEED").interestLevel(InterestLevel.INTERESTED).build());

        assertThat(entry.getCompanyName()).isEqualTo("Nimbus Payroll");
        assertThat(entry.getCompanySector()).isEqualTo("SaaS");
        assertThat(entry.getCompanyStage()).isEqualTo("SEED");
    }

    @Test
    void entries_of_another_firm_cannot_be_deleted() {
        VCFirm other = TestDataBuilder.vcFirm().build();
        other.setId(UUID.randomUUID());
        PoolEntry theirs = PoolEntry.builder().vcFirm(other).build();
        theirs.setId(UUID.randomUUID());
        when(poolEntryRepository.findWithDetailsById(theirs.getId())).thenReturn(Optional.of(theirs));

        assertThatThrownBy(() -> service.deletePoolEntry(actor, theirs.getId()))
                .isInstanceOf(UnauthorizedException.class);
        verify(poolEntryRepository, never()).delete(any());
    }
}
