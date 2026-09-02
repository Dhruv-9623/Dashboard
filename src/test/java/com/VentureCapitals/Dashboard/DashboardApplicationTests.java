package com.VentureCapitals.Dashboard;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@Disabled("Integration tests require database setup. Run after configuring test profile with H2 or Testcontainers.")
class DashboardApplicationTests {

	@Test
	void contextLoads() {
	}

}
