import React from "react";
import { Box, Main, Typography } from "@strapi/design-system";

const App = () => {
  return (
    <Main>
      <Box padding={8} background="neutral100">
        <Typography variant="alpha" tag="h1">
          Permission Manager Pro - Domain, Role, Policy, and Ownership-based access control for Strapi
        </Typography>
        <Box paddingTop={2}>
          <Typography variant="omega" textColor="neutral600">
            Define domain-aware roles and policies, enforce ownership, and evaluate contextual access with deny-by-default behavior.
            This plugin is designed for granular permission orchestration across business modules.
          </Typography>
        </Box>

        <Box paddingTop={8} borderColor="neutral200" borderStyle="solid" borderWidth="1px 0 0 0">
          <Box paddingTop={4}>
            <Typography variant="sigma" textColor="neutral600">
              Need help with this plugin? Reach out or explore the resources below.
            </Typography>
            <Box paddingTop={2}>
              <Typography variant="pi" textColor="neutral500">
                Contact: {" Ejaz Hussain Arain "}
                <Typography
                  variant="pi"
                  textColor="primary600"
                  tag="a"
                  href="mailto:eharain@yahoo.com"
                >
                  eharain@yahoo.com
                </Typography>
                {" · "}
                <Typography
                  variant="pi"
                  textColor="primary600"
                  tag="a"
                  href="https://github.com/eharain"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </Typography>
                {" · "}
                <Typography
                  variant="pi"
                  textColor="primary600"
                  tag="a"
                  href="https://www.linkedin.com/in/ejazarain/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn
                </Typography>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Main>
  );
};

export default App;
